import { ApiProperty } from '@nestjs/swagger';

export class UpdateRateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  price?: number;

  @ApiProperty({ required: false })
  minStay?: number;

  @ApiProperty({ required: false })
  maxStay?: number;

  @ApiProperty({ required: false, default: true })
  available?: boolean;

  @ApiProperty({ required: false, description: 'Stop sell — closed=true in Channex' })
  stopSell?: boolean;

  @ApiProperty({ required: false })
  closedToArrival?: boolean;

  @ApiProperty({ required: false })
  closedToDeparture?: boolean;
}

export class BulkUpdateRatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ required: false })
  price?: number;

  @ApiProperty({ required: false })
  minStay?: number;

  @ApiProperty({ required: false })
  maxStay?: number;

  @ApiProperty({ required: false })
  available?: boolean;

  @ApiProperty({ required: false })
  stopSell?: boolean;

  @ApiProperty({ required: false })
  closedToArrival?: boolean;

  @ApiProperty({ required: false })
  closedToDeparture?: boolean;
}

