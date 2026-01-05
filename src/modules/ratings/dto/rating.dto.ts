import { Expose } from 'class-transformer';

export class DoctorRatingDTO {
  @Expose()
  rating_id: string;

  @Expose()
  doctor_id: string;

  @Expose()
  patient_id: string;

  @Expose()
  rating_score: number;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
