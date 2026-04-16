import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannexHttpClient } from './channex-http.client';
import { Prisma } from '@prisma/client';

export interface SyncProgress {
  phase: string;
  total: number;
  done: number;
  taskIds: string[];
  errors: string[];
}

@Injectable()
export class ChannexDeepSyncService {
  private readonly logger = new Logger(ChannexDeepSyncService.name);
  private readonly masterKey = process.env.CHANNEX_API_KEY || '';

  // In-memory progress map: syncLogId → progress
  private progressMap = new Map<number, SyncProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ChannexHttpClient,
  ) {}

  getProgress(syncLogId: number): SyncProgress | null {
    return this.progressMap.get(syncLogId) ?? null;
  }

  /**
   * Triggers the full sync in the background.
   * Returns a syncLogId immediately so the frontend can poll for progress.
   */
  async startFullSync(userId: string): Promise<{ syncLogId: number }> {
    const log = await this.prisma.syncLog.create({
      data: {
        userId,
        syncType: 'channex_full',
        entityType: 'property',
        status: 'pending',
        message: 'Full sync started',
      },
    });

    // Fire and forget — background job
    setImmediate(() =>
      this.runFullSync(userId, log.id).catch((err) => {
        this.logger.error(`[FullSync] Fatal error: ${err.message}`);
        this.prisma.syncLog
          .update({
            where: { id: log.id },
            data: { status: 'failed', message: err.message },
          })
          .catch(() => {});
      }),
    );

    return { syncLogId: log.id };
  }

  private async runFullSync(userId: string, syncLogId: number) {
    const progress: SyncProgress = {
      phase: 'properties',
      total: 0,
      done: 0,
      taskIds: [],
      errors: [],
    };
    this.progressMap.set(syncLogId, progress);

    try {
      // --- Phase 1: Properties ---
      progress.phase = 'properties';
      this.logger.log(`[FullSync:${syncLogId}] Phase 1 — fetching properties`);

      const propsRes = await this.http.get(
        '/properties?pagination[limit]=100',
        this.masterKey,
      );
      const properties: any[] = propsRes?.data || [];
      progress.total = properties.length;

      for (const prop of properties) {
        try {
          await this.syncProperty(prop, userId, syncLogId, progress);
          progress.done++;
        } catch (err: any) {
          progress.errors.push(`Property ${prop.id}: ${err.message}`);
          this.logger.error(
            `[FullSync] Property ${prop.id} failed: ${err.message}`,
          );
        }
      }

      // --- Phase 2: ARI (500 days, max 2 calls per property) ---
      progress.phase = 'ari';
      const allMappings = await this.prisma.channexMapping.findMany({
        where: { userId },
      });
      progress.total = allMappings.length;
      progress.done = 0;

      for (const mapping of allMappings) {
        if (!mapping.listingId) continue;
        try {
          await this.syncARI500Days(
            mapping.channexPropertyId,
            mapping.listingId,
            progress,
          );
          progress.done++;
        } catch (err: any) {
          progress.errors.push(`ARI ${mapping.channexPropertyId}: ${err.message}`);
        }
      }

      progress.phase = 'complete';
      await this.prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'success',
          message: `Synced ${progress.done} properties. Task IDs: ${progress.taskIds.join(', ')}`,
          details: progress as unknown as Prisma.JsonObject,
        },
      });

      this.logger.log(
        `[FullSync:${syncLogId}] Complete. Task IDs logged: ${progress.taskIds.join(', ')}`,
      );
    } catch (err: any) {
      progress.phase = 'error';
      progress.errors.push(err.message);
      await this.prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', message: err.message },
      });
    }
  }

  private async syncProperty(
    prop: any,
    userId: string,
    _syncLogId: number,
    progress: SyncProgress,
  ) {
    const propId = prop.id;
    const attrs = prop.attributes || {};

    this.logger.log(`[FullSync] Syncing property ${propId} — "${attrs.title}"`);

    const existingListingId = await this.getListingIdByChannexPropId(propId);

    // Upsert listing
    const listing = await this.prisma.listing.upsert({
      where: { id: existingListingId ?? -1 },
      update: {
        title: attrs.title || 'Untitled Property',
        description: attrs.content?.description || null,
        address: attrs.address || null,
        city: attrs.city || null,
        country: attrs.country || null,
        latitude: attrs.latitude ? parseFloat(attrs.latitude) : null,
        longitude: attrs.longitude ? parseFloat(attrs.longitude) : null,
        currency: attrs.currency || 'USD',
        beds24PropId: propId,
      },
      create: {
        userId,
        title: attrs.title || 'Untitled Property',
        description: attrs.content?.description || null,
        address: attrs.address || null,
        city: attrs.city || null,
        country: attrs.country || null,
        latitude: attrs.latitude ? parseFloat(attrs.latitude) : null,
        longitude: attrs.longitude ? parseFloat(attrs.longitude) : null,
        currency: attrs.currency || 'USD',
        beds24PropId: propId,
      },
    });

    // Update or create mapping
    await this.prisma.channexMapping.upsert({
      where: { channexPropertyId: propId },
      update: {
        listingId: listing.id,
        lastSyncAt: new Date(),
        syncStatus: 'active',
      },
      create: {
        userId,
        channexPropertyId: propId,
        listingId: listing.id,
        syncStatus: 'active',
      },
    });

    // Sync room types
    await this.syncRoomTypes(propId, listing.id, progress);

    // Sync photos
    await this.syncPhotos(propId, listing.id, userId);
  }

  private async getListingIdByChannexPropId(
    channexPropId: string,
  ): Promise<number | null> {
    const mapping = await this.prisma.channexMapping.findUnique({
      where: { channexPropertyId: channexPropId },
    });
    return mapping?.listingId ?? null;
  }

  private async syncRoomTypes(
    channexPropId: string,
    listingId: number,
    _progress: SyncProgress,
  ) {
    const res = await this.http.get(
      `/room_types?filter[property_id]=${channexPropId}&pagination[limit]=100`,
      this.masterKey,
    );
    const roomTypes: any[] = res?.data || [];

    for (const rt of roomTypes) {
      const rtAttrs = rt.attributes || {};

      // Fetch rate plans for this room type
      const ratesRes = await this.http.get(
        `/rate_plans?filter[room_type_id]=${rt.id}&pagination[limit]=100`,
        this.masterKey,
      );
      const ratePlans: any[] = ratesRes?.data || [];
      const firstRatePlan = ratePlans[0];

      // Update mapping with room type and rate plan IDs
      await this.prisma.channexMapping.update({
        where: { channexPropertyId: channexPropId },
        data: {
          channexRoomTypeId: rt.id,
          channexRatePlanId: firstRatePlan?.id || null,
        },
      });

      // Update the listing with room details
      await this.prisma.listing.update({
        where: { id: listingId },
        data: {
          maxGuests: rtAttrs.occ_adults || null,
          beds: rtAttrs.count_of_rooms || null,
          beds24RoomId: rt.id,
        },
      });

      this.logger.log(
        `[FullSync] RoomType ${rt.id} synced for listing ${listingId}`,
      );
    }
  }

  private async syncPhotos(
    channexPropId: string,
    listingId: number,
    userId: string,
  ) {
    try {
      const res = await this.http.get(
        `/photos?filter[property_id]=${channexPropId}`,
        this.masterKey,
      );
      const photos: any[] = res?.data || [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const attrs = photo.attributes || {};
        const url =
          attrs.url ||
          attrs.original_url ||
          attrs.thumbnails?.['1024x1024'];
        if (!url) continue;

        const existingPhotoId = await this.getPhotoId(listingId, url);

        await this.prisma.propertyImage.upsert({
          where: { id: existingPhotoId ?? -1 },
          update: { url, displayOrder: i, isPrimary: i === 0 },
          create: {
            userId,
            listingId,
            url,
            thumbnailUrl: attrs.thumbnails?.['320x240'] || null,
            caption: attrs.description || null,
            displayOrder: i,
            isPrimary: i === 0,
          },
        });
      }
      this.logger.log(
        `[FullSync] Synced ${photos.length} photos for listing ${listingId}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[Photos] Failed for property ${channexPropId}: ${err.message}`,
      );
    }
  }

  private async getPhotoId(
    listingId: number,
    url: string,
  ): Promise<number | null> {
    const existing = await this.prisma.propertyImage.findFirst({
      where: { listingId, url },
    });
    return existing?.id ?? null;
  }

  /**
   * PMS Certification: Send 500 days of ARI in MAX 2 API calls.
   * Call 1: days 1–250 | Call 2: days 251–500
   */
  private async syncARI500Days(
    channexPropId: string,
    listingId: number,
    progress: SyncProgress,
  ) {
    const mapping = await this.prisma.channexMapping.findUnique({
      where: { channexPropertyId: channexPropId },
    });
    if (!mapping?.channexRoomTypeId || !mapping?.channexRatePlanId) {
      this.logger.warn(
        `[ARI] No room/rate mapping for ${channexPropId} — skipping`,
      );
      return;
    }

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };

    const dateRanges = [
      { from: fmt(today), to: fmt(addDays(today, 249)) }, // Call 1: 250 days
      {
        from: fmt(addDays(today, 250)),
        to: fmt(addDays(today, 499)),
      }, // Call 2: 250 days
    ];

    for (const range of dateRanges) {
      // Fetch existing rates for this period from our DB
      const rates = await this.prisma.rate.findMany({
        where: {
          listingId,
          date: { gte: new Date(range.from), lte: new Date(range.to) },
        },
      });

      if (rates.length === 0) {
        // No local rates — pull from Channex as source of truth
        await this.pullARIFromChannex(
          channexPropId,
          listingId,
          range.from,
          range.to,
          progress,
        );
      } else {
        // Push local rates to Channex
        await this.pushARIToChannex(channexPropId, mapping, rates, range, progress);
      }
    }

    // Log the task_id in the mapping
    if (progress.taskIds.length > 0) {
      await this.prisma.channexMapping.update({
        where: { channexPropertyId: channexPropId },
        data: {
          lastSyncTaskId: progress.taskIds[progress.taskIds.length - 1],
          lastSyncAt: new Date(),
        },
      });
    }
  }

  private async pushARIToChannex(
    channexPropId: string,
    mapping: any,
    rates: any[],
    range: { from: string; to: string },
    progress: SyncProgress,
  ) {
    const availValues = rates.map((r) => ({
      type: 'availability',
      attributes: {
        property_id: channexPropId,
        room_type_id: mapping.channexRoomTypeId,
        date_from: r.date.toISOString().split('T')[0],
        date_to: r.date.toISOString().split('T')[0],
        availability: r.available ? 1 : 0,
      },
    }));

    const rateValues = rates
      .filter((r) => r.price != null)
      .map((r) => ({
        type: 'rates',
        attributes: {
          property_id: channexPropId,
          room_type_id: mapping.channexRoomTypeId,
          rate_plan_id: mapping.channexRatePlanId,
          date_from: r.date.toISOString().split('T')[0],
          date_to: r.date.toISOString().split('T')[0],
          rate: parseFloat(r.price.toString()),
          min_stay_arrival: r.minStay || 1,
          closed: !r.available,
        },
      }));

    const res = await this.http.post('/ari/bulk_update', this.masterKey, {
      values: [...availValues, ...rateValues],
    });

    const taskId = res?.meta?.task_id;
    if (taskId) {
      progress.taskIds.push(taskId);
      this.logger.log(
        `[ARI Push] task_id=${taskId} range=${range.from}→${range.to} prop=${channexPropId}`,
      );
    }
  }

  private async pullARIFromChannex(
    channexPropId: string,
    listingId: number,
    dateFrom: string,
    dateTo: string,
    progress: SyncProgress,
  ) {
    const res = await this.http.get(
      `/ari?filter[property_id]=${channexPropId}&filter[date][gte]=${dateFrom}&filter[date][lte]=${dateTo}`,
      this.masterKey,
    );

    const entries: any[] = res?.data || [];
    for (const entry of entries) {
      const attrs = entry.attributes || {};
      const date = attrs.date;
      if (!date) continue;

      await this.prisma.rate.upsert({
        where: { listingId_date: { listingId, date: new Date(date) } },
        update: {
          price: attrs.rate ? parseFloat(attrs.rate) : 0,
          available: (attrs.availability ?? 1) > 0,
          minStay: attrs.min_stay_arrival || 1,
        },
        create: {
          listingId,
          date: new Date(date),
          price: attrs.rate ? parseFloat(attrs.rate) : 0,
          available: (attrs.availability ?? 1) > 0,
          minStay: attrs.min_stay_arrival || 1,
        },
      });
    }

    // Capture any task_id in the ARI pull response
    if (res?.meta?.task_id) {
      progress.taskIds.push(res.meta.task_id);
    }

    this.logger.log(
      `[ARI Pull] ${entries.length} entries pulled for listing ${listingId} ${dateFrom}→${dateTo}`,
    );
  }

  // PMS Certification public methods

  async pushCertificationARI(
    propId: string,
    roomTypeId: string,
    ratePlanId: string,
    rate: number,
    availability: number,
    minStay: number,
  ): Promise<string[]> {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };
    const taskIds: string[] = [];
    const ranges = [
      { from: fmt(today), to: fmt(addDays(today, 249)) },
      { from: fmt(addDays(today, 250)), to: fmt(addDays(today, 499)) },
    ];
    for (const range of ranges) {
      const res = await this.http.post<any>("/ari/bulk_update", this.masterKey, {
        values: [
          {
            type: "availability",
            attributes: {
              property_id: propId,
              room_type_id: roomTypeId,
              date_from: range.from,
              date_to: range.to,
              availability,
            },
          },
          {
            type: "rates",
            attributes: {
              property_id: propId,
              room_type_id: roomTypeId,
              rate_plan_id: ratePlanId,
              date_from: range.from,
              date_to: range.to,
              rate,
              min_stay_arrival: minStay,
              closed: false,
              closed_to_arrival: false,
              closed_to_departure: false,
            },
          },
        ],
      });
      const taskId: string | undefined = res?.meta?.task_id;
      if (taskId) {
        taskIds.push(taskId);
        this.logger.log(
          "[CERT ARI] TASK_ID=" + taskId + " range=" + range.from + "->" + range.to + " (call " + taskIds.length + "/2)",
        );
      }
    }
    return taskIds;
  }

  async updateARI(
    propId: string,
    roomTypeId: string,
    ratePlanId: string,
    dateFrom: string,
    dateTo: string,
    values: {
      rate?: number;
      minStay?: number;
      stopSell?: boolean;
      availability?: number;
    },
  ): Promise<string | undefined> {
    const rateAttrs: Record<string, any> = {
      property_id: propId,
      room_type_id: roomTypeId,
      rate_plan_id: ratePlanId,
      date_from: dateFrom,
      date_to: dateTo,
    };
    if (values.rate !== undefined) rateAttrs.rate = values.rate;
    if (values.minStay !== undefined) rateAttrs.min_stay_arrival = values.minStay;
    if (values.stopSell !== undefined) rateAttrs.closed = values.stopSell;

    const payload: any[] = [{ type: "rates", attributes: rateAttrs }];
    if (values.availability !== undefined) {
      payload.push({
        type: "availability",
        attributes: {
          property_id: propId,
          room_type_id: roomTypeId,
          date_from: dateFrom,
          date_to: dateTo,
          availability: values.availability,
        },
      });
    }

    const res = await this.http.post<any>("/ari/bulk_update", this.masterKey, {
      values: payload,
    });
    const taskId: string | undefined = res?.meta?.task_id;
    if (taskId) {
      this.logger.log("[ARI Update] TASK_ID=" + taskId + " " + dateFrom + "->" + dateTo);
    }
    return taskId;
  }
}
