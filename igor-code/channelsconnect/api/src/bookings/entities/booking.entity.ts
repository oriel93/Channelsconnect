import { ApiProperty } from '@nestjs/swagger';
import { Booking } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class BookingEntity implements Booking {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  listingId: number;

  @ApiProperty()
  guestName: string;

  @ApiProperty({ required: false, nullable: true })
  guestEmail: string | null;

  @ApiProperty({ required: false, nullable: true })
  guestPhone: string | null;

  @ApiProperty()
  checkIn: Date;

  @ApiProperty()
  checkOut: Date;

  @ApiProperty()
  numGuests: number;

  @ApiProperty()
  totalPrice: Decimal;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false, nullable: true })
  bookingSource: string | null;

  @ApiProperty({ required: false, nullable: true })
  externalId: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

