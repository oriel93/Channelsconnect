import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncAirbnbDto {
  @ApiProperty({ description: 'Airbnb Host ID' })
  airbnbHostId: string;

  @ApiProperty({ description: 'Listing ID or external listing ID' })
  listingId: string;

  @ApiPropertyOptional({ description: 'Optional listing name override' })
  name?: string;

  @ApiPropertyOptional({ description: 'Optional description override' })
  description?: string;

  @ApiPropertyOptional({ description: 'Optional images override', type: [String] })
  images?: string[];

  @ApiPropertyOptional({ description: 'Maximum guests' })
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'Room size in square meters' })
  sqM2?: number;

  @ApiPropertyOptional({ description: 'Minimum stay in nights' })
  minStay?: number;

  @ApiPropertyOptional({ description: 'Cleaning fee' })
  cleaningFee?: number;

  @ApiPropertyOptional({ description: 'Tax percentage' })
  taxPercent?: number;

  @ApiPropertyOptional({ description: 'Security deposit' })
  securityDeposit?: number;

  @ApiPropertyOptional({ description: 'Available dates with pricing' })
  availableDates?: Record<string, any>;
}

