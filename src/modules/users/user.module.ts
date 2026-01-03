import { Module, forwardRef } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { PatientModule } from '../patients/patient.module';

@Module({
  imports: [
    ValidateModule,
    forwardRef(() => PatientModule),
  ],
  controllers: [UserController],
  providers: [
    UserRepository,
    UserService,
    DataTransformer
  ],
  exports: [
    UserRepository,
    UserService,
    DataTransformer
  ]
})
export class UserModule {}
