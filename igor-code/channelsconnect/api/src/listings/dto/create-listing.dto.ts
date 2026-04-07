import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  postalCode?: string;

  @ApiProperty({ required: false })
  latitude?: number;

  @ApiProperty({ required: false })
  longitude?: number;

  @ApiProperty({ required: false })
  propertyType?: string;

  @ApiProperty({ required: false })
  bedrooms?: number;

  @ApiProperty({ required: false })
  bathrooms?: number;

  @ApiProperty({ required: false })
  maxGuests?: number;

  @ApiProperty({ required: false })
  basePrice?: number;

  @ApiProperty({ required: false, default: 'USD' })
  currency?: string;

  @ApiProperty({ required: false })
  amenities?: any;

  @ApiProperty({ required: false })
  houseRules?: string;

  @ApiProperty({ required: false })
  cancellationPolicy?: string;

  @ApiProperty({ required: false })
  checkInTime?: string;

  @ApiProperty({ required: false })
  checkOutTime?: string;

  @ApiProperty({ required: false, default: 1 })
  minNights?: number;

  @ApiProperty({ required: false })
  maxNights?: number;

  @ApiProperty({ required: false, default: true })
  isActive?: boolean;
}

