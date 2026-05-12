import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateManualBookingDto } from './dto/create-manual-booking.dto';
import { BookingEntity } from './entities/booking.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('bookings')
@ApiTags('bookings')
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiCreatedResponse({ type: BookingEntity })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.id, createBookingDto);
  }

  /**
   * TASK 2 — Manual Direct Booking (Channex Test 11 - Create)
   *
   * - Inserts the booking record into the local DB.
   * - Deducts inventory (+1 blocked night) via applyChange → event-driven push to Channex.
   * - Returns the created booking so the UI can display success + task IDs.
   */
  @Post('manual')
  @ApiCreatedResponse({ type: BookingEntity })
  createManual(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateManualBookingDto,
  ) {
    return this.bookingsService.createManual(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ type: BookingEntity, isArray: true })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('listingId') listingId?: string,
  ) {
    return this.bookingsService.findAll(user.id, listingId ? parseInt(listingId) : undefined);
  }

  @Get('upcoming')
  @ApiOkResponse({ type: BookingEntity, isArray: true })
  findUpcoming(@CurrentUser() user: CurrentUserData) {
    return this.bookingsService.findUpcoming(user.id);
  }

  @Get('my-bookings')
  @ApiOkResponse({ type: BookingEntity, isArray: true })
  findMyBookings(@CurrentUser() user: CurrentUserData) {
    return this.bookingsService.findAll(user.id);
  }

  @Get('listing/:listingId')
  @ApiOkResponse({ 
    type: BookingEntity, 
    isArray: true,
    description: 'Get all bookings for a specific listing',
  })
  findByListingId(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.bookingsService.findByListingId(listingId);
  }

  @Get(':id')
  @ApiOkResponse({ type: BookingEntity })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  /**
   * TASK 3 — Modify Booking (Channex Test 11 - Modify)
   *
   * Updates checkIn/checkOut dates:
   *   1. Restores inventory for the OLD date range.
   *   2. Deducts inventory for the NEW date range.
   *   3. Saves the booking.
   *   4. applyChange() event emitter automatically pushes delta to Channex.
   */
  @Patch(':id')
  @ApiOkResponse({ type: BookingEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  /**
   * TASK 3 — Cancel Booking (Channex Test 11 - Cancel)
   *
   * - Sets booking status to 'cancelled'.
   * - Restores inventory for the booking's date range (+1 per night).
   * - applyChange() event emitter automatically pushes restored availability to Channex.
   */
  @Patch(':id/cancel')
  @ApiOkResponse({ type: BookingEntity })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.cancelBooking(id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: BookingEntity })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }
}