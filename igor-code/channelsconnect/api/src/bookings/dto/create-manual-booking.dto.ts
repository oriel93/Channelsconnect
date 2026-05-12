import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualBookingDto {
  @ApiProperty({ description: 'Internal listing (room) ID' })
  listingId: number;

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