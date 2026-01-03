import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from '../users/user.module';
import { DoctorModule } from '../doctors/doctor.module';
import { PatientModule } from '../patients/patient.module';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    PrismaModule, 
    UserModule, 
    DoctorModule, 
    PatientModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatGateway],
  exports: [ChatService, ChatRepository],
})
export class ChatModule {}