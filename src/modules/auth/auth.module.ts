import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './auth.constant';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../users/user.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { QueueModule } from '../queue/queue.module';
import { PatientModule } from '../patients/patient.module';
import { DoctorModule } from '../doctors/doctor.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5m' },
    }),
    PassportModule,
    UserModule,
    MailModule,
    QueueModule,
    DoctorModule,
    PatientModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    JwtStrategy
  ],
})
export class AuthModule {}
