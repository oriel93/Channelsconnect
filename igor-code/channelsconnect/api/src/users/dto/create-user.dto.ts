import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Supabase Auth UUID' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty({ required: false, default: 'user' })
  role?: string;

  @ApiProperty({ required: false, description: 'Airbnb host ID extracted from profile URL' })
  airbnbHostId?: string;

  @ApiProperty({ required: false, description: 'Bank account holder name for payouts' })
  payoutAccountHolderName?: string;

  @ApiProperty({ required: false, description: 'Bank routing number for payouts' })
  payoutRoutingNumber?: string;

  @ApiProperty({ required: false, description: 'Bank account number for payouts' })
  payoutAccountNumber?: string;
}

