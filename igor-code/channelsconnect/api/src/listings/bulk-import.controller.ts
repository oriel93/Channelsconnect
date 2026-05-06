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

// Airbnb-only — the iFrame flow handles the real connection;
// this endpoint is kept as a lightweight webhook/fallback capture.
const OtaUrlSchema = z.object({
  otaUrl: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (u) => u.includes('airbnb.com'),
      'Only Airbnb listings are supported through this option. For other platforms, use Excel or Manual import.',
    ),
  title: z.string().optional().default(''),
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
    const { otaUrl, title } = parsed.data;

    // Airbnb-only at this point (schema already validated)
    const source = 'airbnb_url';

    // Create listing placeholder — full connection happens via /connect/airbnb/init
    const listing = await this.prisma.listing.create({
      data: {
        userId:       user.id,
        title:        title || 'Airbnb Import — pending',
        source,
        isActive:     false,
        reviewStatus: 'pending_airbnb_connect',
        captureUrl:   otaUrl,
        currency:     'USD',
        minNights:    1,
      },
    });

    this.logger.log(`[Ingest] Airbnb URL captured by ${user.id} → listingId=${listing.id}`);

    return {
      listingId: listing.id,
      status:    'pending_airbnb_connect',
      message:   'Your Airbnb listing has been noted. Use the Connect Airbnb flow to link your account.',
    };
  }

  // ── Tier 2: Excel Template Download ──────────────────────────────────────

  @Get('bulk-import/template')
  @Public()
  @ApiOperation({ summary: 'Download the Channels Connect Excel import template (.xlsx)' })
  downloadTemplate(@Res() res: Response) {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Instructions ─────────────────────────────────────────────
    const instructions = XLSX.utils.aoa_to_sheet([
      ['Channels Connect — Property Import Template'],
      [''],
      ['HOW TO USE THIS FILE'],
      ['1. Read these instructions carefully before filling in any data.'],
      ['2. Fill in the "Properties" sheet — one row per property. Required fields are marked *.'],
      ['3. Fill in the "Room_Types" sheet — one row per room type. Link to the property by name.'],
      ['4. Fill in the "Rate_Plans" sheet — define your rate plans (optional but recommended).'],
      ['5. Save the file and upload it in the Channels Connect dashboard.'],
      ['6. Our team will review your data and publish your properties within 1–2 business days.'],
      [''],
      ['IMPORTANT NOTES'],
      ['• Do NOT change sheet names or column headers — they are read automatically.'],
      ['• Property Name must match exactly between the Properties and Room_Types sheets.'],
      ['• Country codes must be ISO 3-letter codes (e.g. USA, GBR, AUS, DEU, CAN).'],
      ['• Currency codes must be ISO 4217 (e.g. USD, EUR, GBP, AUD).'],
      ['• Phone numbers: include country code + area code (e.g. 1-305-555-0100).'],
      ['• Addresses must be in English characters only.'],
      ['• Do NOT include city, state, or country in the "Street Address" column.'],
      ['• For questions: support@channelsconnect.com'],
      [''],
      ['CHANNEL CODES (for reference)'],
      ['Booking.com', 'BDC'],
      ['Airbnb', 'ABB'],
      ['Expedia', 'EXP'],
      ['VRBO', 'VRB'],
      ['Agoda', 'AGO'],
    ]);
    instructions['!cols'] = [{ wch: 80 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, instructions, 'Instructions');

    // ── Sheet 2: Properties ───────────────────────────────────────────────
    const propHeaders = [
      'Property Name *',
      'Type of Unit *',
      'Number of Room Types *',
      'Provider Code',
      'Street Address *',
      'City *',
      'State / Province *',
      'Postal Code *',
      'Country Code *',
      'Phone Number *',
      'Currency *',
      'Property Type *',
      'Cancellation Time',
      'Cut Off Days',
      'Tax ID Number',
      'Billing Contact Name',
      'Billing Contact Email',
      'Wheelchair Accessible',
      'Elevators',
      'Pets Allowed',
      'Front Desk',
      'Front Desk Hours Start',
      'Front Desk Hours End',
      'Self Check-in',
      'Check-in Time Start',
      'Check-in Time End',
      'Check-out Time',
      'Email Check-in Instructions',
      'Advance Notice Required',
      'Damage Deposit',
      'Damage Deposit Amount',
      'Check-in at Different Location',
      'Alternative Check-in Address',
      'Parking',
      'Cleaning Fees',
      'Cleaning Fee Amount',
      'WiFi',
      'Pool',
      'Total Rooms / Units',
      'Parties / Events Policy',
    ];

    const propNotes = [
      '* Required. Full property name as it should appear on booking sites.',
      '* Single Unit or Multi Unit',
      '* Integer: number of distinct room types to create',
      'Your internal property code (optional)',
      '* Street only — no city/state/country here',
      '* Required',
      '* Required',
      '* Required',
      '* 3-letter ISO code: USA, GBR, AUS, DEU, CAN, etc.',
      '* Country code + number. E.g. 1-305-555-0100',
      '* 3-letter ISO 4217: USD, EUR, GBP, AUD',
      '* Private vacation Home, Apartment, Condo, Villa, etc.',
      'e.g. 2:00 PM',
      'Days before arrival that booking is cut off. 0 = same day.',
      'Tax ID / EIN / VAT number',
      'Full name of billing contact',
      'Email for billing/invoices',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      '24 hours / Limited hours / No Front desk',
      'If limited hours: start time (e.g. 9:00 AM)',
      'If limited hours: end time (e.g. 5:00 PM)',
      'Yes - Lockbox / Yes - Access code / Yes - Smart lock / No',
      'e.g. 3:00 PM',
      'e.g. 10:00 PM',
      'e.g. 11:00 AM',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      'If yes, amount in property currency',
      'Yes / No',
      'Full address if different from property',
      'Free / Paid / Not available',
      'Yes / No',
      'If yes, amount per stay in property currency',
      'Free / Paid / Not available',
      'Indoor / Outdoor / Not available',
      'Total number of units / rooms',
      'Parties/events allowed / Parties/events not allowed',
    ];

    const propExample = [
      'Beachfront Villa Miami', 'Single Unit', 1, 'BEACHVILLA01',
      '123 Ocean Drive', 'Miami Beach', 'FL', '33139', 'USA',
      '1-305-555-0100', 'USD', 'Private vacation Home',
      '2:00 PM', 1, '12-345-6789', 'Finance Department', 'billing@example.com',
      'Yes', 'No', 'Yes', '24 hours', '', '', 'Yes - Lockbox',
      '3:00 PM', '10:00 PM', '11:00 AM', 'Yes', 'No',
      'Yes', 500, 'No', '', 'Free', 'Yes', 150, 'Free', 'Outdoor', 1,
      'Parties/events not allowed',
    ];

    const propWs = XLSX.utils.aoa_to_sheet([propHeaders, propNotes, propExample]);
    propWs['!cols'] = propHeaders.map(() => ({ wch: 28 }));
    XLSX.utils.book_append_sheet(wb, propWs, 'Properties');

    // ── Sheet 3: Room_Types ───────────────────────────────────────────────
    const roomHeaders = [
      'Property Name *',
      'Provider Code',
      'Type of Unit *',
      'Room Code',
      'Registry Number',
      'Room Type Category *',
      'Custom Label',
      'Private Pool',
      'In-room Laundry',
      'Air Conditioning',
      'Fan',
      'Heating',
      'Kitchen',
      'Cookware & Utensils',
      'Refrigerator',
      'Stovetop',
      'Dishwasher',
      'Oven',
      'Microwave',
      'Private Bathroom',
      'Bath Configuration',
      'Towels Provided',
      'Full Bathrooms',
      'Bedrooms',
      'Max Occupancy *',
      'Min Adult Age',
      'Sofa Beds',
      'Bedroom 1 Bed Type',
      'Bedroom 2 Bed Type',
      'Bedroom 3 Bed Type',
      'Bedroom 4 Bed Type',
    ];

    const roomNotes = [
      '* Must match exactly the Property Name in the Properties sheet',
      'Your internal code (optional)',
      '* Single Unit or Multi Unit',
      'Your room code (optional)',
      'Short-term rental permit / registry number if required by local law',
      '* House, Apartment, Studio, Suite, Villa, Condo, Cabin, Cottage, etc.',
      'Custom display name for this room type (optional)',
      'Yes / No',
      'All-in-one washer/dryer / Washing machine / No',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      'Full Kitchen / Kitchenette / No',
      'Yes / No',
      'Full-sized / Compact / Mini / No',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      'Yes / No',
      'Shower only / Bathtub only / Shower/tub combination / Separate bathtub and shower',
      'Yes / No',
      'Integer 0–20',
      'Integer 0–20 (0 for studio)',
      '* Total guests allowed',
      'Minimum age considered adult (default 18)',
      'Number of sofa beds in common areas (free text)',
      '1 King / 1 Queen / 2 Twin / 1 Double / 1 Bunk Bed',
      '1 King / 1 Queen / 2 Twin / 1 Double / 1 Bunk Bed',
      '1 King / 1 Queen / 2 Twin / 1 Double / 1 Bunk Bed',
      '1 King / 1 Queen / 2 Twin / 1 Double / 1 Bunk Bed',
    ];

    const roomExample = [
      'Beachfront Villa Miami', 'BEACHVILLA01', 'Single Unit', '', '',
      'House', '', 'No', 'All-in-one washer/dryer', 'Yes', 'No', 'Yes',
      'Full Kitchen', 'Yes', 'Full-sized', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'Separate bathtub and shower', 'Yes', 2, 3, 6, 18,
      'No', '1 King', '1 Queen', '2 Twin', '',
    ];

    const roomWs = XLSX.utils.aoa_to_sheet([roomHeaders, roomNotes, roomExample]);
    roomWs['!cols'] = roomHeaders.map(() => ({ wch: 26 }));
    XLSX.utils.book_append_sheet(wb, roomWs, 'Room_Types');

    // ── Sheet 4: Rate_Plans ───────────────────────────────────────────────
    const rateHeaders = [
      'Rate Plan Name *',
      'Cancellation Policy *',
      'Free Cancel Until (days before arrival)',
      'Penalty After Free Cancel',
      'Second Cutoff (days before arrival)',
      'Final Penalty',
      'Min Advance Booking Days',
      'Max Advance Booking Days',
      'Min Length of Stay',
      'Max Length of Stay',
    ];

    const rateNotes = [
      '* e.g. Standard Rate, Weekly Rate, Non-refundable',
      '* Free cancellation / Non-refundable / Partial penalty',
      'Days before arrival until which free cancellation applies',
      'e.g. 1 Night Room & Tax / 50% Cost of Stay / 100% Cost of Stay',
      'If 3-tier policy: second cutoff in days',
      'e.g. 100% Cost of Stay',
      'Minimum days in advance a booking must be made',
      'Maximum days in advance a booking can be made',
      'Minimum nights per stay',
      'Maximum nights per stay',
    ];

    const rateExample1 = ['Standard Rate', 'Free cancellation', 30, '1 Night Room & Tax', 7, '100% Cost of Stay', '', '', 2, ''];
    const rateExample2 = ['Weekly Rate', 'Free cancellation', 45, '50% Cost of Stay', '', '', '', '', 7, ''];
    const rateExample3 = ['Non-refundable', 'Non-refundable', '', '', '', '100% Cost of Stay', '', '', 1, ''];

    const rateWs = XLSX.utils.aoa_to_sheet([rateHeaders, rateNotes, rateExample1, rateExample2, rateExample3]);
    rateWs['!cols'] = rateHeaders.map(() => ({ wch: 32 }));
    XLSX.utils.book_append_sheet(wb, rateWs, 'Rate_Plans');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="channels_connect_property_import.xlsx"',
    );
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
        houseRules:   auditNote,   // consent audit trail stored here — website imports have no house rules at creation
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
