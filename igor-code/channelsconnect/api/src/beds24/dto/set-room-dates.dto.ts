import { ApiProperty } from '@nestjs/swagger';
import { Beds24AuthDto } from './beds24-auth.dto';

export class SetRoomDatesDto {
  @ApiProperty({ type: Beds24AuthDto })
  authentication: Beds24AuthDto;

  @ApiProperty()
  roomId: number;

  @ApiProperty({ 
    description: 'Dates object with keys in YYYYMMDD format',
    example: { '20240101': { p1: 10000, i: 1 } }
  })
  dates: Record<string, any>;
}

