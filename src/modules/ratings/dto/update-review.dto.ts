import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateDoctorReviewDTO {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating_score?: number;
}
