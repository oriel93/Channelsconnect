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

  @ApiProperty({ required: false, description: 'Timestamp when user accepted Terms of Service' })
  tosAcceptedAt?: Date;

  @ApiProperty({ required: false, description: 'IP address at time of registration (legal audit trail)' })
  signupIp?: string;

  @ApiProperty({ required: false, description: 'User phone number collected at signup' })
  phone?: string;
}

