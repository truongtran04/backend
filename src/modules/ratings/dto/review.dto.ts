import { Expose, Type } from 'class-transformer';
import { DoctorRatingDTO } from './rating.dto';

export class DoctorReviewDTO {
  @Expose()
  review_id: string;

  @Expose()
  doctor_id: string;

  @Expose()
  patient_id: string;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  rating_score: number;

  @Expose()
  helpful_count: number;

  @Expose()
  is_verified: boolean;

  @Expose()
  doctor_reply?: string;

  @Expose()
  reply_at?: Date;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
