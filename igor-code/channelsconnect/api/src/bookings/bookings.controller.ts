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

  @Patch(':id')
  @ApiOkResponse({ type: BookingEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

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

