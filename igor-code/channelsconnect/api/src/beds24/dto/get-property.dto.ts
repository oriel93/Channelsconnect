import { ApiProperty } from '@nestjs/swagger';
import { Beds24AuthDto } from './beds24-auth.dto';

export class GetPropertyDto {
  @ApiProperty({ type: Beds24AuthDto })
  authentication: Beds24AuthDto;

  @ApiProperty({ default: true })
  includeRooms?: boolean;

  @ApiProperty({ default: false })
  includeRoomUnits?: boolean;

  @ApiProperty({ default: false })
  includeAccountAccess?: boolean;
}

