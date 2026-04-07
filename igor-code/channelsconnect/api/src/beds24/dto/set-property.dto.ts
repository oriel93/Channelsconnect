import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomTypeDto {
  @ApiProperty()
  action: 'new' | 'modify';

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  qty?: number;

  @ApiPropertyOptional()
  roomId?: number;

  @ApiPropertyOptional()
  roomSize?: number;

  @ApiPropertyOptional()
  minStay?: number;

  @ApiPropertyOptional()
  maxPeople?: number;

  @ApiPropertyOptional()
  cleaningFee?: number;

  @ApiPropertyOptional()
  taxPercent?: number;

  @ApiPropertyOptional()
  securityDeposit?: number;
}

export class SetPropertyDto {
  @ApiProperty()
  action: 'modify';

  @ApiProperty({ type: [RoomTypeDto] })
  roomTypes: RoomTypeDto[];
}

