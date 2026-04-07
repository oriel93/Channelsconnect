import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseService } from './supabase.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Global()
@Module({
  providers: [
    SupabaseService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [SupabaseService],
})
export class AuthModule {}

