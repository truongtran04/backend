import { Module, forwardRef } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { UserModule } from '../users/user.module';

@Module({
  imports: [
    ValidateModule,
    forwardRef(() => UserModule)
  ],
  controllers: [PatientController],
  providers: [
    PatientRepository,
    PatientService,
    DataTransformer
  ],
  exports: [
    PatientRepository,
    PatientService,
    DataTransformer
  ]
})
export class PatientModule {}
