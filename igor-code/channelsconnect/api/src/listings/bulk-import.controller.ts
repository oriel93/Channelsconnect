/**
 * BulkImportController — 4-Tier Property Ingestion Engine
 *
 * Tier 1  POST /listings/ingest/ota-url       — OTA URL + optional iCal → pending_ota_scrape
 * Tier 2  GET  /listings/bulk-import/template — Download XLSX template (no lat/lng)
 *         POST /listings/bulk-import/upload   — Upload & geocode via Nominatim → pending_admin_review
 * Tier 3  POST /listings/ingest/website       — Website URL + consent → pending_website_extract
 * Tier 4  Handled by listings.controller.ts   — Manual form POST /listings/manual
 *
 * SAFE: No dependency on Channex sync, ARI, or webhook logic.
 */
import {
  Controller, Get, Post, Body, Res, Req,
  UploadedFile, UseInterceptors, BadRequestException,
  UnprocessableEntityException, HttpCode, HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

// ─── Nominatim geocoder (OpenStreetMap — no API key required) ────────────────

async function geocodeAddress(address: string, city: string, state: string, zip: string, country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const parts = [address, city, state, zip, country].filter(Boolean).join(', ');
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: parts, format: 'json', limit: 1, addressdetails: 0 },
      headers: { 'User-Agent': 'ChannelsConnect-PMS/1.0 (support@channelsconnect.com)' },
      timeout: 8000,
    });
    if (res.data?.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Excel row schema (human-friendly, no lat/lng) ───────────────────────────

// ─── optionalRate: accepts positive number | empty string | null | undefined ──
// xlsx gives empty cells as '' (with defval:''), or sometimes null/undefined.
// Blank MinRate/MaxRate cells must parse to undefined, not fail validation.
const optionalRate = () =>
  z.union([
    z.coerce.number().positive(),
    z.literal(''),
    z.literal(0),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .transform(v => (v === '' || v === null || v === undefined || v === 0 ? undefined : Number(v)));

// ─── Excel row schema ─────────────────────────────────────────────────────────
// z.coerce.string() on all string fields: xlsx parses numeric-looking cells
// (zip codes like 10001, time-of-day decimals) as JS numbers — coerce handles it.
// raw: false on sheet_to_json ensures times come as "3:00 PM" not 0.625 decimal.
const ExcelRowSchema = z.object({
  // ─ Required ────────────────────────────────────────────────────────────────
  Title:          z.coerce.string().min(2, 'Title must be at least 2 characters'),
  Address:        z.coerce.string().min(5, 'Street address required'),
  City:           z.coerce.string().min(1, 'City required'),
  MaxGuests:      z.coerce.number().int().positive('MaxGuests must be a positive integer'),
  BaseRate:       z.coerce.number().positive('BaseRate must be positive'),

  // ─ Optional strings (coerced — xlsx may give numbers for zip/time cells) ──
  State:          z.coerce.string().optional().default(''),
  Zip:            z.coerce.string().optional().default(''),    // 10001 → "10001"
  Country:        z.coerce.string().optional().default(''),
  PropertyType:   z.coerce.string().optional().default(''),
  Beds:           z.coerce.string().optional().default(''),    // "1 King, 2 Queen"
  Amenities:      z.coerce.string().optional().default(''),
  Description:    z.coerce.string().optional().default(''),
  CheckInTime:    z.coerce.string().optional().default(''),    // "3:00 PM" (raw:false)
  CheckOutTime:   z.coerce.string().optional().default(''),
  HouseRules:     z.coerce.string().optional().default(''),
  CancellationPolicy: z.coerce.string().optional().default(''),
  Currency:       z.coerce.string().min(2).max(4).optional().default('USD'),

  // ─ Optional numbers ────────────────────────────────────────────────────────
  Bedrooms:       z.coerce.number().int().min(0).optional().default(0),
  Bathrooms:      z.coerce.number().min(0).optional().default(0),
  MinNights:      z.coerce.number().int().positive().optional().default(1),

  // ─ Rate limits: empty/null/undefined → undefined (not set) ────────────────
  MinRate:        optionalRate(),
  MaxRate:        optionalRate(),
});
type ValidRow = z.infer<typeof ExcelRowSchema>;

// ─── OTA URL schema ──────────────────────────────────────────────────────────

const OtaUrlSchema = z.object({
  otaUrl:   z.string().url('Must be a valid Airbnb or VRBO URL'),
  icalUrl:  z.string().url('Must be a valid iCal URL').optional().or(z.literal('')),
  title:    z.string().optional().default(''),
});

// ─── Website import schema ───────────────────────────────────────────────────

const WebsiteImportSchema = z.object({
  url:           z.string().url('Must be a valid URL'),
  consentGiven:  z.literal(true, {
    error: 'Your authorisation is required to extract property data from this URL',
  }),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('listings')
@ApiTags('listings-ingestion')
@ApiBearerAuth()
export class BulkImportController {
  private readonly logger = new Logger(BulkImportController.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Tier 1: OTA URL Import ────────────────────────────────────────────────

  @Post('ingest/ota-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit Airbnb/VRBO URL for async extraction — creates pending_ota_scrape listing' })
  async ingestOtaUrl(
    @CurrentUser() user: CurrentUserData,
    @Body() body: unknown,
  ) {
    const parsed = OtaUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    const { otaUrl, icalUrl, title } = parsed.data;

    // Detect OTA source
    const source = otaUrl.includes('airbnb') ? 'airbnb_url'
                 : otaUrl.includes('vrbo') || otaUrl.includes('homeaway') ? 'vrbo_url'
                 : 'ota_url';

    // Create listing placeholder
    const listing = await this.prisma.listing.create({
      data: {
        userId:       user.id,
        title:        title || `Importing from ${source.replace('_', ' ')}…`,
        source,
        isActive:     false,
        reviewStatus: 'pending_ota_scrape',
        captureUrl:   otaUrl,
        currency:     'USD',
        minNights:    1,
      },
    });

    // If iCal URL provided, save it immediately for calendar sync
    if (icalUrl) {
      await this.prisma.icalConnection.create({
        data: {
          userId:        user.id,
          listingId:     listing.id,
          name:          'OTA Calendar',
          icalUrl,
          syncDirection: 'import',
          syncEnabled:   true,
        },
      }).catch(() => {}); // non-fatal
    }

    this.logger.log(`[Ingest] OTA URL submitted by ${user.id} → listingId=${listing.id} source=${source}`);

    return {
      listingId: listing.id,
      status:    'pending_ota_scrape',
      message:   'We are extracting your photos and descriptions. We will notify you when your listing is ready for review.',
    };
  }

  // ── Tier 2: Excel Template Download ──────────────────────────────────────

  @Get('bulk-import/template')
  @Public()  // No auth needed — static template file, no user data
  @ApiOperation({ summary: 'Download the Excel import template (.xlsx)' })
  downloadTemplate(@Res() res: Response) {
    const headers = [
      'Title', 'Address', 'City', 'State', 'Zip', 'Country',
      'PropertyType', 'MaxGuests', 'Bedrooms', 'Bathrooms', 'Beds',
      'BaseRate', 'MinRate', 'MaxRate', 'Currency',
      'Amenities', 'Description', 'CheckInTime', 'CheckOutTime',
      'MinNights', 'HouseRules', 'CancellationPolicy',
    ];

    const exampleRow = [
      'Beachfront Villa', '123 Ocean Drive', 'Miami Beach', 'FL', '33139', 'USA',
      'House', '6', '3', '2', '1 King, 2 Queen, 1 Twin',
      '350', '200', '600', 'USD',
      'WiFi, Pool, Air Conditioning, Parking, Kitchen, BBQ',
      'Stunning ocean views, 3-min walk to beach.',
      '3:00 PM', '11:00 AM',
      '2', 'No smoking, No parties', 'Strict',
    ];

    const notesRow = [
      '* Required', '* Required', '* Required', 'Optional', 'Optional', 'Optional (e.g. USA)',
      'e.g. House/Apartment/Villa', '* Required integer', 'Integer ≥ 0', 'Number ≥ 0', 'e.g. 1 King, 2 Queen',
      '* Required (USD)', 'Optional', 'Optional', '3-letter code',
      'Comma-separated list', 'Free text', '12/24hr format', '12/24hr format',
      'Integer ≥ 1', 'Free text', 'e.g. Strict/Moderate/Flexible',
    ];

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.aoa_to_sheet([headers, exampleRow, notesRow]);

    // Column widths
    ws['!cols'] = headers.map((h) => ({
      wch: Math.max(h.length + 4, 18),
    }));

    // Style header row bold (xlsx lite — just set the value objects)
    headers.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (ws[addr]) ws[addr].s = { font: { bold: true } };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Properties');

    // Legend sheet
    const legend = XLSX.utils.aoa_to_sheet([
      ['Field', 'Required?', 'Notes'],
      ['Title', 'Yes', 'Full property name'],
      ['Address', 'Yes', 'Street address only — do NOT include city/state here'],
      ['City', 'Yes', ''],
      ['State', 'No', 'State or province'],
      ['Zip', 'No', 'Postal / ZIP code'],
      ['Country', 'No', 'Full name or 2/3-letter code (e.g. USA, UK, DE)'],
      ['PropertyType', 'No', 'House, Apartment, Villa, Condo, Studio, Suite, etc.'],
      ['MaxGuests', 'Yes', 'Total person capacity'],
      ['Bedrooms', 'No', 'Integer'],
      ['Bathrooms', 'No', 'Decimals OK (e.g. 1.5)'],
      ['Beds', 'No', 'e.g. "1 King, 2 Queen, 1 Twin"'],
      ['BaseRate', 'Yes', 'Default nightly rate in Currency'],
      ['MinRate', 'No', 'Minimum dynamic price floor'],
      ['MaxRate', 'No', 'Maximum dynamic price ceiling'],
      ['Currency', 'No', 'ISO 4217 — defaults to USD'],
      ['Amenities', 'No', 'Comma-separated: WiFi, Pool, Kitchen, Parking, etc.'],
      ['Description', 'No', 'Property description for OTAs'],
      ['CheckInTime', 'No', 'e.g. 3:00 PM or 15:00'],
      ['CheckOutTime', 'No', 'e.g. 11:00 AM or 11:00'],
      ['MinNights', 'No', 'Minimum booking length (default 1)'],
      ['HouseRules', 'No', 'Free text — No smoking, No parties, etc.'],
      ['CancellationPolicy', 'No', 'Strict / Moderate / Flexible / Non-refundable'],
    ]);
    legend['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, legend, 'Field Guide');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="channels_connect_import_template.xlsx"');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buf);
  }

  // ── Tier 2: Excel Upload + Geocode ────────────────────────────────────────

  @Post('bulk-import/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Excel file — geocodes addresses, saves as pending_admin_review' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadExcel(
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const ext = file.originalname.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      throw new BadRequestException('File must be an Excel spreadsheet (.xlsx or .xls)');
    }

    const wb   = XLSX.read(file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    // raw: false — xlsx formats dates/times as strings ("3:00 PM") not Excel decimal serials.
    // defval: '' — empty cells become empty string, not undefined (matches z.coerce.string default).
    const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' });

    // Skip the notes/example row from the template (row 3: contains "* Required" annotations).
    // Also skip any row where Title is empty, blank, or literally "Title" (re-pasted header).
    const rows = allRows.filter((r) => {
      const title = String(r['Title'] ?? '').trim();
      return title !== '' && title.toLowerCase() !== 'title' && !title.startsWith('*');
    });

    if (rows.length === 0) throw new BadRequestException('Spreadsheet is empty or contains only header/notes rows');
    if (rows.length > 200) throw new UnprocessableEntityException('Maximum 200 rows per upload');

    // ── Validate all rows up front (fail-fast) ──────────────────────────────
    const errors: string[] = [];
    const validRows: ValidRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = ExcelRowSchema.safeParse(rows[i]);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errors.push(`Row ${i + 2}: ${issue.path.join('.') || 'field'} — ${issue.message}`);
        });
      } else {
        validRows.push(result.data);
      }
    }
    if (errors.length > 0) {
      throw new UnprocessableEntityException({ errors, message: `${errors.length} validation error(s) found — no rows saved` });
    }

    // ── Geocode + insert (sequential — respect Nominatim rate limit: 1 req/s) ──
    const created: { rowIndex: number; listingId: number; title: string; geocoded: boolean }[] = [];
    const geocodeFailed: number[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      // Geocode
      const geo = await geocodeAddress(row.Address, row.City, row.State, row.Zip, row.Country);
      if (!geo) geocodeFailed.push(i + 2); // row number for user feedback

      // Build amenities JSON
      const amenitiesArr = row.Amenities
        ? row.Amenities.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const listing = await this.prisma.listing.create({
        data: {
          userId:            user.id,
          title:             row.Title,
          address:           row.Address,
          city:              row.City,
          state:             row.State || null,
          postalCode:        row.Zip || null,
          country:           row.Country || null,
          latitude:          geo?.lat ?? null,
          longitude:         geo?.lng ?? null,
          propertyType:      row.PropertyType || null,
          maxGuests:         row.MaxGuests,
          bedrooms:          row.Bedrooms ?? null,
          bathrooms:         row.Bathrooms != null ? row.Bathrooms : null,
          basePrice:         row.BaseRate,
          currency:          row.Currency || 'USD',
          amenities:         amenitiesArr.length ? amenitiesArr : null,
          description:       row.Description || null,
          checkInTime:       row.CheckInTime || null,
          checkOutTime:      row.CheckOutTime || null,
          minNights:         row.MinNights ?? 1,
          houseRules:        row.HouseRules || null,
          cancellationPolicy: row.CancellationPolicy || null,
          source:            'excel_import',
          isActive:          false,
          reviewStatus:      'pending_admin_review',
        },
      });

      created.push({ rowIndex: i + 2, listingId: listing.id, title: row.Title, geocoded: !!geo });

      // Nominatim rate limit — 1 req/s
      if (i < validRows.length - 1) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    this.logger.log(`[BulkImport] user=${user.id} imported ${created.length} listings (${geocodeFailed.length} geocode failures)`);

    return {
      imported:       created.length,
      geocodeFailed:  geocodeFailed.length,
      geocodeFailRows: geocodeFailed,
      listings:       created,
      message:        `${created.length} propert${created.length === 1 ? 'y' : 'ies'} submitted for admin review. ${geocodeFailed.length > 0 ? `${geocodeFailed.length} row(s) could not be geocoded — coordinates will need to be set manually.` : ''}`,
    };
  }

  // ── Tier 3: Website URL Import ────────────────────────────────────────────

  @Post('ingest/website')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit website URL for admin extraction — creates pending_website_extract listing' })
  async ingestWebsite(
    @CurrentUser() user: CurrentUserData,
    @Req() req: any,
    @Body() body: unknown,
  ) {
    const parsed = WebsiteImportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    const { url } = parsed.data;

    // ── Consent audit record ──────────────────────────────────────────────────
    // Server-authoritative timestamp + IP for legal consent trail.
    // X-Forwarded-For is set by the ALB/Cloudflare proxy; fall back to req.ip.
    const serverIp  = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
                      ?? req.ip
                      ?? 'unknown';
    const serverTs  = new Date().toISOString();
    const auditNote = `[WEBSITE_CONSENT] authorized_at=${serverTs} | ip=${serverIp} | url=${url}`;

    const listing = await this.prisma.listing.create({
      data: {
        userId:       user.id,
        title:        `Importing from website…`,
        source:       'website_import',
        captureUrl:   url,
        isActive:     false,
        reviewStatus: 'pending_website_extract',
        currency:     'USD',
        minNights:    1,
        notes:        auditNote,   // stored for admin audit trail
      },
    });

    this.logger.log(`[Ingest] Website consent by ${user.email ?? user.id} | ip=${serverIp} | url=${url} | listingId=${listing.id}`);

    return {
      listingId:        listing.id,
      status:           'pending_website_extract',
      consentRecordedAt: serverTs,
      consentIp:        serverIp,
      message:          'Our team is working behind the scenes to extract and boost your listing. We will notify you when it is ready.',
    };
  }
}
