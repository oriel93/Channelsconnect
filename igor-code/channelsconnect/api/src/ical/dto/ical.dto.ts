import { ApiProperty } from '@nestjs/swagger';

export class CreateIcalConnectionDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  icalUrl: string;

  @ApiProperty({ required: false, default: 'import' })
  syncDirection?: string;

  @ApiProperty({ required: false, default: true })
  syncEnabled?: boolean;
}

export class UpdateIcalConnectionDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  icalUrl?: string;

  @ApiProperty({ required: false })
  syncDirection?: string;

  @ApiProperty({ required: false })
  syncEnabled?: boolean;
}

export class SyncIcalDto {
  @ApiProperty()
  connectionId: number;
}

export class ImportIcalDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  icalUrl: string;
}

