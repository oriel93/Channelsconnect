import { ApiProperty } from '@nestjs/swagger';
import { Listing } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class ListingEntity implements Listing {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ required: false, nullable: true })
  address: string | null;

  @ApiProperty({ required: false, nullable: true })
  city: string | null;

  @ApiProperty({ required: false, nullable: true })
  state: string | null;

  @ApiProperty({ required: false, nullable: true })
  country: string | null;

  @ApiProperty({ required: false, nullable: true })
  postalCode: string | null;

  @ApiProperty({ required: false, nullable: true })
  latitude: Decimal | null;

  @ApiProperty({ required: false, nullable: true })
  longitude: Decimal | null;

  @ApiProperty({ required: false, nullable: true })
  propertyType: string | null;

  @ApiProperty({ required: false, nullable: true })
  bedrooms: number | null;

  @ApiProperty({ required: false, nullable: true })
  bathrooms: Decimal | null;

  @ApiProperty({ required: false, nullable: true })
  beds: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxGuests: number | null;

  @ApiProperty({ required: false, nullable: true })
  basePrice: Decimal | null;

  @ApiProperty()
  currency: string;

  @ApiProperty({ required: false, nullable: true })
  amenities: any;

  @ApiProperty({ required: false, nullable: true })
  houseRules: string | null;

  @ApiProperty({ required: false, nullable: true })
  cancellationPolicy: string | null;

  @ApiProperty({ required: false, nullable: true })
  checkInTime: string | null;

  @ApiProperty({ required: false, nullable: true })
  checkOutTime: string | null;

  @ApiProperty()
  minNights: number;

  @ApiProperty({ required: false, nullable: true })
  maxNights: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false, nullable: true, description: 'Channex property ID (legacy column beds24PropId)' })
  channexPropertyId: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Channex room/roomType ID (legacy column beds24RoomId)' })
  channexRoomId: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Airbnb listing ID' })
  airbnbListingId: string | null;

  @ApiProperty({ description: 'Channel source (always channex)' })
  source: string;

  @ApiProperty({ required: false, nullable: true, description: 'Original Airbnb URL used for content capture' })
  captureUrl: string | null;

  @ApiProperty({
    description: 'Admin review status: pending_admin_review | approved | rejected',
    default: 'approved',
  })
  reviewStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

