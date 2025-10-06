import { Module } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { UserModule } from '../users/user.module';
import { DoctorModule } from '../doctors/doctor.module';

@Module({
  imports: [
    ValidateModule,
    UserModule,
    DoctorModule
  ],
  controllers: [ScheduleController],
  providers: [ScheduleRepository, ScheduleService, DataTransformer],
  exports: [ScheduleRepository, ScheduleService, DataTransformer]
})
export class ScheduleModule {}
