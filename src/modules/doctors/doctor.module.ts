import { Module, forwardRef } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { DoctorController } from './doctor.controller';
import { DoctorRepository } from './doctor.repository';
import { DoctorService } from './doctor.service';
import { UserModule } from '../users/user.module';
import { SpecialtyModule } from '../specialties/specialty.module';
import { QueueModule } from '../queue/queue.module';
import { DoctorProcessor } from './doctor.process';
import { ScheduleModule } from '../schedules/schedule.module';

@Module({
  imports: [
    ValidateModule,
    UserModule,
    SpecialtyModule,
    forwardRef(() => QueueModule),
    forwardRef(() => ScheduleModule)
  ],
  controllers: [DoctorController],
  providers: [
    DoctorRepository,
    DoctorService,
    DataTransformer,
    DoctorProcessor
  ],
  exports: [
    DoctorRepository,
    DoctorService,
    DataTransformer
  ]
})
export class DoctorModule { }
