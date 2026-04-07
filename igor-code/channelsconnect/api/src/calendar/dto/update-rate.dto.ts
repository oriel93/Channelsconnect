import { ApiProperty } from '@nestjs/swagger';

export class UpdateRateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  minStay?: number;

  @ApiProperty({ required: false, default: true })
  available?: boolean;
}

export class BulkUpdateRatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  minStay?: number;

  @ApiProperty({ required: false })
  available?: boolean;
}

