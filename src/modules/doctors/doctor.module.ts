import { Module, forwardRef  } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { DoctorController } from './doctor.controller';
import { DoctorRepository } from './doctor.repository';
import { DoctorService } from './doctor.service';
import { UserModule } from '../users/user.module';
import { SpecialtyModule } from '../specialties/specialty.module';

@Module({
  imports: [
    ValidateModule,
    UserModule,
    SpecialtyModule
  ],
  controllers: [DoctorController],
  providers: [
    DoctorRepository,
    DoctorService,
    DataTransformer
  ],
  exports: [
    DoctorRepository,
    DoctorService,
    DataTransformer
  ]
})
export class DoctorModule {}
