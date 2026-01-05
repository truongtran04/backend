import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateDoctorRatingDTO {
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating_score?: number;
}
