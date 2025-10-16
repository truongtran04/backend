import { Module, Global } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  imports:[],
  controllers: [],
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: () => {
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        return createClient(url, key);
      },
    },
    SupabaseService
  ],
  exports: ['SUPABASE_CLIENT', SupabaseService],
})
export class SupabaseModule {}