import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MedbotController } from './medbot.controller';
import { MedbotService } from './medbot.service';
import { DoctorModule } from '../doctors/doctor.module';
import { SpecialtyModule } from '../specialties/specialty.module';
import { AppointmentModule } from '../appointments/appointment.module';
import { UserModule } from '../users/user.module';

@Module({
    imports: [HttpModule, DoctorModule, SpecialtyModule, AppointmentModule, UserModule],
    controllers: [MedbotController],
    providers: [MedbotService],
})
export class MedbotModule {}
