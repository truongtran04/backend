import { Module } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { AppointmentController } from './appointment.controller';
import { AppointmentRepository } from './appointment.repository';
import { AppointmentService } from './appointment.service';
import { UserModule } from '../users/user.module';
import { PatientModule } from '../patients/patient.module';
import { DoctorModule } from '../doctors/doctor.module';
import { ScheduleModule } from '../schedules/schedule.module';

@Module({
  imports: [
    ValidateModule,
    UserModule,
    PatientModule,
    DoctorModule,
    ScheduleModule
  ],
  controllers: [AppointmentController],
  providers: [AppointmentRepository, AppointmentService, DataTransformer],
  exports: [AppointmentRepository, AppointmentService, DataTransformer]
})
export class AppointmentModule {}
