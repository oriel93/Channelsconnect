/**
 * BulkImportController — Excel / website ingestion endpoints.
 *
 * SAFE: No dependency on Channex sync, ARI, or webhook logic.
 */
import {
  Controller, Get, Post, Body, Res, Req,
  UploadedFile, UseInterceptors, BadRequestException,
  UnprocessableEntityException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

// ─── Zod row schema ──────────────────────────────────────────────────────────

const RowSchema = z.object({
  Title:        z.string().min(2, 'Title must be at least 2 characters'),
  Address:      z.string().min(5, 'Address must be at least 5 characters'),
  Latitude:     z.coerce.number().min(-90).max(90),
  Longitude:    z.coerce.number().min(-180).max(180),
  BasePrice:    z.coerce.number().positive('BasePrice must be positive'),
  MaxGuests:    z.coerce.number().int().positive(),
  Bedrooms:     z.coerce.number().int().nonnegative(),
  Bathrooms:    z.coerce.number().nonnegative(),
  PropertyType: z.string().optional().default(''),
  City:         z.string().optional().default(''),
  Country:      z.string().optional().default(''),
  Amenities:    z.string().optional().default(''),
  Description:  z.string().optional().default(''),
});

type ValidRow = z.infer<typeof RowSchema>;

// ─── Website import Zod schema ───────────────────────────────────────────────

const WebsiteImportSchema = z.object({
  url:          z.string().url('Must be a valid URL'),
  consentGiven: z.literal(true, {
    error: 'User consent is required to import from this URL',
  }),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('listings')
@ApiTags('listings-ingestion')
@ApiBearerAuth()
export class BulkImportController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Template Download ─────────────────────────────────────────────────────

  @Get('bulk-import/template')
  downloadTemplate(@Res() res: Response) {
    const headers = [
      'Title', 'Address', 'Latitude', 'Longitude', 'BasePrice',
      'MaxGuests', 'Bedrooms', 'Bathrooms', 'PropertyType',
      'City', 'Country', 'Amenities', 'Description',
    ];

    const exampleRows = [
      [
        'Luxury Beach Villa',
        '123 Ocean Drive, Miami Beach, FL 33139',
        25.7826, -80.1340, 350, 8, 4, 3.5,
        'villa', 'Miami Beach', 'USA',
        'WiFi, Pool, AC, Parking, Kitchen, Washer, Balcony',
        'Stunning beachfront villa with private pool and ocean views.',
      ],
      [
        'Downtown Studio Apartment',
        '456 Main Street, New York, NY 10001',
        40.7506, -73.9971, 150, 2, 0, 1,
        'apartment', 'New York', 'USA',
        'WiFi, AC, Kitchen, Elevator',
        'Modern studio in the heart of Manhattan, steps from Times Square.',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

    // Column widths
    ws['!cols'] = headers.map((h) => ({
      wch: Math.max(h.length + 4, 15),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Properties');

    const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="channels-connect-property-template.xlsx"',
    );
    res.send(buffer);
  }

  // ── Bulk Upload ───────────────────────────────────────────────────────────

  @Post('bulk-import/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (_, file, cb) => {
        const ok =
          file.mimetype.includes('spreadsheet') ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls');
        cb(ok ? null : new BadRequestException('Only .xlsx files are accepted'), ok);
      },
    }),
  )
  async bulkUpload(
    // @ts-ignore — Multer types may not be globally declared
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Parse workbook
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Could not parse the Excel file. Please use the provided template.');
    }

    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file contains no sheets');

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
      wb.Sheets[sheetName],
      { defval: '' },
    );

    if (rows.length === 0) {
      throw new BadRequestException('The spreadsheet contains no data rows (header row only).');
    }

    if (rows.length > 200) {
      throw new BadRequestException('Maximum 200 properties per upload. Please split your file.');
    }

    // ── Validate all rows first (fail-fast: return all errors before any insert) ──
    const validationErrors: { row: number; field: string; message: string }[] = [];
    const validRows: ValidRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = RowSchema.safeParse(rows[i]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          validationErrors.push({
            row: i + 2, // +2: 1 for 0-index, 1 for header row
            field: issue.path.join('.') || 'unknown',
            message: issue.message,
          });
        }
      } else {
        validRows.push(result.data);
      }
    }

    if (validationErrors.length > 0) {
      throw new UnprocessableEntityException({
        message: `${validationErrors.length} validation error(s) found. Fix the highlighted cells and re-upload.`,
        errors: validationErrors,
      });
    }

    // ── Atomic bulk insert ─────────────────────────────────────────────────
    const createData = validRows.map((row) => ({
      userId:       user.id,
      title:        row.Title,
      address:      row.Address,
      latitude:     row.Latitude,
      longitude:    row.Longitude,
      basePrice:    row.BasePrice,
      maxGuests:    row.MaxGuests,
      bedrooms:     row.Bedrooms,
      bathrooms:    row.Bathrooms,
      propertyType: row.PropertyType || null,
      city:         row.City || null,
      country:      row.Country || null,
      amenities:    row.Amenities
        ? row.Amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      description:  row.Description || null,
      source:       'excel_bulk',
      isActive:     false, // pending admin review
    }));

    const result = await this.prisma.listing.createMany({
      data: createData,
      skipDuplicates: true,
    });

    return {
      created: result.count,
      message: `${result.count} properties imported. They are pending review and will be activated shortly.`,
    };
  }

  // ── Website Import ────────────────────────────────────────────────────────

  @Post('import/website')
  @HttpCode(HttpStatus.CREATED)
  async importFromWebsite(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Validate input
    const parsed = WebsiteImportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      throw new BadRequestException(firstError.message);
    }
    const { url } = parsed.data;

    // Fetch the page with a 10-second timeout
    let htmlBody = '';
    let extractedTitle = '';
    let extractedDescription = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ChannelsConnect/1.0; +https://channelsconnect.com)',
          Accept: 'text/html',
        },
      }).finally(() => clearTimeout(timeout));

      if (response.ok) {
        htmlBody = await response.text();
      }
    } catch (err) {
      // Non-fatal — we still create the draft with empty extracted data
      console.warn(`[WebsiteImport] Fetch failed for ${url}: ${err.message}`);
    }

    // Extract basic metadata from HTML
    if (htmlBody) {
      const titleMatch = htmlBody.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim().slice(0, 200);
      }

      const descMatch = htmlBody.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ?? htmlBody.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      );
      if (descMatch) {
        extractedDescription = descMatch[1].trim().slice(0, 1000);
      }
    }

    // Create a draft listing (isActive=false = pending admin review)
    const listing = await this.prisma.listing.create({
      data: {
        userId:      user.id,
        title:       extractedTitle || 'Imported Property',
        description: extractedDescription || null,
        captureUrl:  url,
        source:      'website_import',
        isActive:    false,
      },
    });

    return {
      listingId: listing.id,
      title:     listing.title,
      message:
        'Property imported successfully. Our team will review and enhance the details before activation.',
    };
  }
}
