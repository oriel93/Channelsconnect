import { ApiProperty } from '@nestjs/swagger';

export class Beds24AuthDto {
  @ApiProperty({ description: 'Beds24 API Key' })
  apiKey: string;

  @ApiProperty({ description: 'Property Key in Beds24' })
  propKey: string;
}

