import { ApiProperty } from '@nestjs/swagger';

export class CalendarQueryDto {
  @ApiProperty()
  listingId: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;
}

