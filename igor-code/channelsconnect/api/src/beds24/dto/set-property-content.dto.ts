import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TextContentDto {
  @ApiPropertyOptional()
  EN?: string;
}

export class ImageMapDto {
  @ApiProperty()
  propId: number;

  @ApiProperty()
  position: number;
}

export class ExternalImageDto {
  @ApiProperty()
  url: string;

  @ApiProperty({ type: [ImageMapDto] })
  map: ImageMapDto[];
}

export class RoomTextsDto {
  @ApiPropertyOptional({ type: TextContentDto })
  displayName?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  accommodationType?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  propertyDescription1?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  propertyDescription2?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  roomDescription1?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  headlineText?: TextContentDto;

  @ApiPropertyOptional({ type: TextContentDto })
  propertyDescriptionText?: TextContentDto;
}

export class RoomContentDto {
  @ApiProperty()
  roomId: number;

  @ApiPropertyOptional()
  cleaningFee?: number;

  @ApiPropertyOptional()
  taxPercent?: number;

  @ApiPropertyOptional()
  minStay?: number;

  @ApiPropertyOptional()
  securityDeposit?: number;

  @ApiPropertyOptional()
  roomType?: number;

  @ApiPropertyOptional({ type: [[String]] })
  featureCodes?: string[][];

  @ApiPropertyOptional({ type: RoomTextsDto })
  texts?: RoomTextsDto;

  @ApiPropertyOptional()
  images?: {
    external?: Record<number, ExternalImageDto>;
  };
}

export class SetPropertyContentDto {
  @ApiProperty()
  action: 'modify';

  @ApiProperty({ type: 'object', additionalProperties: { type: 'object' } })
  roomIds: Record<number, RoomContentDto>;
}

