import { ApiProperty } from '@nestjs/swagger';

export class BlockDateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ required: false, description: 'Specific room within the listing (multi-room).' })
  roomTypeId?: number;

  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  reason?: string;
}

export class BulkBlockDatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ required: false, description: 'Specific room within the listing (multi-room).' })
  roomTypeId?: number;

  @ApiProperty({ type: [Date] })
  dates: Date[];

  @ApiProperty({ required: false })
  reason?: string;
}

export class UnblockDateDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ required: false })
  roomTypeId?: number;

  @ApiProperty()
  date: Date;
}

export class BulkUnblockDatesDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty({ required: false })
  roomTypeId?: number;

  @ApiProperty({ type: [Date] })
  dates: Date[];
}

