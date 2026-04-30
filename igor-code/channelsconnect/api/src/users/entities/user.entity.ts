import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, SyncStatus } from '@prisma/client';

export class UserEntity implements User {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  name: string | null;

  @ApiProperty({ required: false, nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty({ required: false, nullable: true, description: 'Airbnb host ID extracted from profile URL' })
  airbnbHostId: string | null;

  @ApiProperty({ enum: ['idle', 'syncing', 'completed', 'failed'], description: 'Sync status' })
  syncStatus: SyncStatus;

  @ApiProperty({ required: false, nullable: true, description: 'When sync started' })
  syncStartedAt: Date | null;

  @ApiProperty({ required: false, nullable: true, description: 'When sync completed' })
  syncCompletedAt: Date | null;

  @ApiProperty({ required: false, nullable: true, description: 'Error message if sync failed' })
  syncError: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Timestamp when user accepted Terms of Service' })
  tosAcceptedAt: Date | null;

  @ApiProperty({ required: false, nullable: true, description: 'IP address at time of registration (legal audit trail)' })
  signupIp: string | null;

  // Snake_case aliases added by manual DB migration; present in Prisma type after db pull
  @ApiPropertyOptional()
  tos_accepted_at: Date | null;

  @ApiPropertyOptional()
  signup_ip: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Bank account holder name for payouts' })
  payoutAccountHolderName: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Bank routing number for payouts' })
  payoutRoutingNumber: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Bank account number for payouts (encrypted)' })
  payoutAccountNumber: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

