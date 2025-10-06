import { forwardRef, Module } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { SpecialtyRepository } from './specialty.repository';
import { SpecialtyService } from './specialty.service';
import { SpecialtyController } from './specialty.controller';
import { UserModule } from '../users/user.module';

@Module({
  imports: [
    ValidateModule,
    forwardRef(() => UserModule)
  ],
  controllers: [SpecialtyController],
  providers: [SpecialtyRepository, SpecialtyService, DataTransformer],
  exports: [SpecialtyRepository, SpecialtyService, DataTransformer]
})
export class SpecialtyModule {}
