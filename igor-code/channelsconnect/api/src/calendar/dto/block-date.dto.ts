import { ApiProperty } from '@nestjs/swagger';

export class BlockDateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  reason?: string;
}

export class BulkBlockDatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ type: [Date] })
  dates: Date[];

  @ApiProperty({ required: false })
  reason?: string;
}

export class UnblockDateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  date: Date;
}

export class BulkUnblockDatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ type: [Date] })
  dates: Date[];
}

