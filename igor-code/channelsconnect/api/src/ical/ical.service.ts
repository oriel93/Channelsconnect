import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIcalConnectionDto, UpdateIcalConnectionDto } from './dto/ical.dto';
import * as ical from 'node-ical';
import ICalendar from 'ical-generator';

@Injectable()
export class IcalService {
  constructor(private prisma: PrismaService) {}

  // ─── Connections CRUD ──────────────────────────────────────────────────────

  async createConnection(userId: string, createDto: CreateIcalConnectionDto) {
    return this.prisma.icalConnection.create({
      data: { ...createDto, userId },
    });
  }

  async findAll(userId?: string, listingId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (listingId) where.listingId = listingId;
    return this.prisma.icalConnection.findMany({
      where,
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.icalConnection.findUnique({
      where: { id },
      include: { listing: true },
    });
  }

  async update(id: number, updateDto: UpdateIcalConnectionDto) {
    return this.prisma.icalConnection.update({ where: { id }, data: updateDto });
  }

  async remove(id: number) {
    return this.prisma.icalConnection.delete({ where: { id } });
  }

  // ─── iCal Import ───────────────────────────────────────────────────────────

  /**
   * Fetch + parse an external .ics URL and upsert booking records.
   * All dates are normalized to UTC.
   */
  async importIcal(
    userId: string,
    listingId: number,
    icalUrl: string,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    // Verify listing exists and belongs to user
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, userId },
    });
    if (!listing) throw new NotFoundException('Listing not found or access denied');

    let events: Record<string, ical.CalendarComponent>;
    try {
      events = await ical.async.fromURL(icalUrl);
    } catch (err) {
      throw new Error(`Failed to fetch iCal feed: ${err.message}`);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [uid, event] of Object.entries(events)) {
      if (event.type !== 'VEVENT') continue;

      const vevent = event as ical.VEvent;
      if (!vevent.start || !vevent.end) {
        skipped++;
        continue;
      }

      // Normalize to UTC Date objects
      const checkIn = new Date(vevent.start);
      const checkOut = new Date(vevent.end);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        errors.push(`Event ${uid}: invalid date(s)`);
        skipped++;
        continue;
      }

      if (checkIn >= checkOut) {
        skipped++;
        continue;
      }

      const summary = typeof vevent.summary === 'string'
        ? vevent.summary
        : (vevent.summary as any)?.val ?? 'iCal Import';

      try {
        // Upsert by externalId (UID from iCal)
        const existing = await this.prisma.booking.findFirst({
          where: { listingId, externalId: uid },
        });

        if (existing) {
          await this.prisma.booking.update({
            where: { id: existing.id },
            data: { checkIn, checkOut, notes: summary, status: 'confirmed' },
          });
        } else {
          await this.prisma.booking.create({
            data: {
              userId,
              listingId,
              guestName: summary,
              checkIn,
              checkOut,
              numGuests: 1,
              totalPrice: 0,
              status: 'confirmed',
              bookingSource: 'ical',
              externalId: uid,
              notes: summary,
            },
          });
          imported++;
        }
      } catch (err) {
        errors.push(`Event ${uid}: ${err.message}`);
        skipped++;
      }
    }

    // Record last sync
    await this.prisma.icalConnection.updateMany({
      where: { listingId, userId, icalUrl },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'success' },
    });

    return { imported, skipped, errors };
  }

  // ─── iCal Export ───────────────────────────────────────────────────────────

  /**
   * Generate a valid .ics calendar string for all non-cancelled bookings
   * of a given listing. Suitable for serving as text/calendar.
   */
  async exportIcal(listingId: number): Promise<string> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const bookings = await this.prisma.booking.findMany({
      where: { listingId, status: { not: 'cancelled' } },
      orderBy: { checkIn: 'asc' },
    });

    // ical-generator v4+ uses default export as a function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createIcal = require('ical-generator').default ?? require('ical-generator');
    const cal = createIcal({
      name: listing.title ?? `Listing ${listingId}`,
      prodId: '//ChannelsConnect//PMS//EN',
    });

    for (const b of bookings) {
      cal.createEvent({
        start: b.checkIn,
        end: b.checkOut,
        summary: `Booking #${b.id} — ${b.guestName}`,
        description: b.notes ?? '',
        uid: `booking-${b.id}@channelsconnect.com`,
      });
    }

    return cal.toString();
  }

  // ─── Sync helpers ──────────────────────────────────────────────────────────

  async syncConnection(id: number) {
    const conn = await this.prisma.icalConnection.findUnique({ where: { id } });
    if (!conn) throw new NotFoundException('Connection not found');

    let result: Awaited<ReturnType<typeof this.importIcal>>;
    try {
      result = await this.importIcal(conn.userId, conn.listingId, conn.icalUrl);
      await this.prisma.icalConnection.update({
        where: { id },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'success' },
      });
    } catch (err) {
      await this.prisma.icalConnection.update({
        where: { id },
        data: { lastSyncAt: new Date(), lastSyncStatus: `error: ${err.message}` },
      });
      throw err;
    }

    return { message: 'Sync complete', connectionId: id, ...result };
  }

  async syncAll(userId: string) {
    const connections = await this.prisma.icalConnection.findMany({
      where: { userId, syncEnabled: true },
    });

    const results = await Promise.allSettled(
      connections.map((c) => this.syncConnection(c.id)),
    );

    return {
      message: 'All syncs complete',
      results: results.map((r, i) => ({
        connectionId: connections[i].id,
        status: r.status,
        ...(r.status === 'fulfilled' ? r.value : { error: (r as any).reason?.message }),
      })),
    };
  }
}
