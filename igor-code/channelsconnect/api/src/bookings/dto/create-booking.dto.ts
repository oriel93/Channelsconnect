import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  guestName: string;

  @ApiProperty({ required: false })
  guestEmail?: string;

  @ApiProperty({ required: false })
  guestPhone?: string;

  @ApiProperty()
  checkIn: Date;

  @ApiProperty()
  checkOut: Date;

  @ApiProperty()
  numGuests: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty({ required: false, default: 'confirmed' })
  status?: string;

  @ApiProperty({ required: false })
  bookingSource?: string;

  @ApiProperty({ required: false })
  externalId?: string;

  @ApiProperty({ required: false })
  notes?: string;
}

