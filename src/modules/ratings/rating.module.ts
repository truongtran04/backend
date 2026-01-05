import { Module, forwardRef } from '@nestjs/common';
import { ValidateModule } from 'src/modules/validate/validate.module';
import { DataTransformer } from 'src/common/bases/data.transform';
import { RatingController } from './rating.controller';
import { ReviewController } from './review.controller';
import { ReviewHelpfulController } from './review-helpful.controller';
import { RatingRepository } from './rating.repository';
import { ReviewRepository } from './review.repository';
import { ReviewHelpfulRepository } from './review-helpful.repository';
import { RatingService } from './rating.service';
import { ReviewService } from './review.service';
import { ReviewHelpfulService } from './review-helpful.service';
import { DoctorModule } from '../doctors/doctor.module';
import { PatientModule } from '../patients/patient.module';
import { UserModule } from '../users/user.module';
import { DoctorRatingDTO } from './dto/rating.dto';
import { DoctorReviewDTO } from './dto/review.dto';

@Module({
  imports: [
    ValidateModule,
    forwardRef(() => DoctorModule),
    forwardRef(() => PatientModule),
    UserModule
  ],
  controllers: [
    RatingController,
    ReviewController,
    ReviewHelpfulController
  ],
  providers: [
    RatingRepository,
    ReviewRepository,
    ReviewHelpfulRepository,
    RatingService,
    ReviewService,
    ReviewHelpfulService,
    DataTransformer,
  ],
  exports: [
    RatingRepository,
    ReviewRepository,
    ReviewHelpfulRepository,
    RatingService,
    ReviewService,
    ReviewHelpfulService,
    DataTransformer
  ]
})
export class RatingModule { }
