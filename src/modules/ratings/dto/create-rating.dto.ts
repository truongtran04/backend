import { IsString, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateDoctorRatingDTO {
  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @IsString()
  @IsNotEmpty()
  patient_id: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating_score: number;
}
