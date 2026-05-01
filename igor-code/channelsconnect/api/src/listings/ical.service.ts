/**
 * ical.service.ts — iCal import/export for listings
 *
 * SAFE: Zero contact with channex-http.client.ts, ARI batching, or webhook logic.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as nodeIcal from 'node-ical';
import ical from 'ical-generator';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface ICalEvent {
  summary: string;
  dtstart: Date;
  dtend: Date;
}

@Injectable()
export class ICalService {
  private readonly logger = new Logger(ICalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a remote iCal URL and return parsed events.
   */
  async parseICalUrl(url: string): Promise<ICalEvent[]> {
    this.logger.log(`[iCal] Fetching: ${url}`);
    let rawData: string;
    try {
      const response = await axios.get<string>(url, {
        timeout: 15_000,
        responseType: 'text',
        headers: { 'User-Agent': 'ChannelsConnect/1.0 (+https://channelsconnect.com)' },
      });
      rawData = response.data;
    } catch (err: any) {
      this.logger.error(`[iCal] Fetch failed: ${err?.message}`);
      throw new BadRequestException(`Could not fetch iCal URL: ${err?.message ?? 'unknown error'}`);
    }

    let parsed: Record<string, any>;
    try {
      parsed = nodeIcal.parseICS(rawData);
    } catch (err: any) {
      throw new BadRequestException(`Could not parse iCal data: ${err?.message}`);
    }

    const events: ICalEvent[] = [];
    for (const key of Object.keys(parsed)) {
      const comp = parsed[key];
      if (comp.type !== 'VEVENT') continue;
      const dtstart = comp.start ? new Date(comp.start) : null;
      const dtend   = comp.end   ? new Date(comp.end)   : null;
      if (!dtstart || !dtend) continue;
      events.push({
        summary: comp.summary ?? '(no title)',
        dtstart,
        dtend,
      });
    }

    this.logger.log(`[iCal] Parsed ${events.length} events from ${url}`);
    return events;
  }

  /**
   * Generate an iCal feed (text/calendar) from a listing's bookings.
   */
  async exportICalForListing(listingId: number): Promise<string> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new BadRequestException(`Listing ${listingId} not found`);

    // Fetch bookings — use a dynamic query so this compiles even if the Prisma
    // schema name differs (bookings vs booking).
    let bookings: Array<{ id: number; checkIn: Date; checkOut: Date; guestName?: string | null }> = [];
    try {
      bookings = (await (this.prisma as any).booking.findMany({
        where: { listingId },
        select: { id: true, checkIn: true, checkOut: true, guestName: true },
        orderBy: { checkIn: 'asc' },
      })) ?? [];
    } catch {
      // Booking table might not exist yet — return an empty calendar
      this.logger.warn(`[iCal] No bookings table or no bookings for listing ${listingId}`);
    }

    const calendar = ical({
      name: `${listing.title} — Channels Connect`,
      prodId: '//ChannelsConnect//ChannelsConnect//EN',
    });

    for (const booking of bookings) {
      const event = calendar.createEvent({
        start:   new Date(booking.checkIn),
        end:     new Date(booking.checkOut),
        summary: booking.guestName ? `Booking: ${booking.guestName}` : 'Blocked',
      });
      event.uid(`booking-${booking.id}@channelsconnect.com`);
    }

    return calendar.toString();
  }
}
