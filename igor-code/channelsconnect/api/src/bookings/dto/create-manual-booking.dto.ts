import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualBookingDto {
  @ApiProperty({ description: 'Internal listing (room) ID' })
  listingId: number;

  @ApiPropertyOptional({
    description:
      'Specific room_type id within the listing. Required when the listing has >1 room type. ' +
      'When omitted on a single-room listing, the only room_type is auto-assigned.',
  })
  roomTypeId?: number;

  @ApiProperty({ description: 'Guest full name' })
  guestName: string;

  @ApiPropertyOptional()
  guestEmail?: string;

  @ApiPropertyOptional()
  guestPhone?: string;

  @ApiProperty({ description: 'Check-in date (YYYY-MM-DD)' })
  checkIn: string; // 'YYYY-MM-DD'

  @ApiProperty({ description: 'Check-out date (YYYY-MM-DD)' })
  checkOut: string; // 'YYYY-MM-DD'

  @ApiProperty({ description: 'Number of guests' })
  numGuests: number;

  @ApiProperty({ description: 'Total booking price (in currency units)' })
  totalPrice: number;

  @ApiPropertyOptional({ default: 'direct' })
  bookingSource?: string;

  @ApiPropertyOptional()
  notes?: string;
}