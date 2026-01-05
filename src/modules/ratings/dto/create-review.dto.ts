import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateDoctorReviewDTO {
  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @IsString()
  @IsNotEmpty()
  patient_id: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating_score: number;

  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;
}
