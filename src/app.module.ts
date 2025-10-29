import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module'; 
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv }  from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './modules/mail/mail.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ValidatorModule } from './validator/validator.module';
import { ValidateModule } from './modules/validate/validate.module';
import { SpecialtyModule } from './modules/specialties/specialty.module';
import { PatientModule } from './modules/patients/patient.module';
import { DoctorModule } from './modules/doctors/doctor.module';
import { ScheduleModule } from './modules/schedules/schedule.module';
import { AppointmentModule } from './modules/appointments/appointment.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    PrismaModule,
    MailModule,
    ValidatorModule,
    ValidateModule,
    SpecialtyModule,
    PatientModule,
    DoctorModule,
    ScheduleModule,
    AppointmentModule,
    SupabaseModule,
    ChatModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        return {
           stores: [
            // new Keyv({
            //   store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            //   namespace: 'nestjs-memory-cache',
            // }),
            createKeyv('redis://localhost:6379/1',{ 
              namespace: 'nestjs_new_cache' 
            }),
          ],
        };
      }
    }),
    BullModule.forRootAsync({
      imports:[ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', '')
        },
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: true
        }
      }),
      inject: [ConfigService]
    }),
    
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}