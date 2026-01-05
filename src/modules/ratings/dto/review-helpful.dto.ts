import { IsString, IsBoolean, IsNotEmpty, IsUUID, Length } from 'class-validator';

export class ReviewHelpfulDTO {
  @IsString({ message: 'Review ID phải là chuỗi' })
  @IsNotEmpty({ message: 'Review ID là bắt buộc' })
  @IsUUID('4', { message: 'Review ID phải là UUID hợp lệ' })
  review_id: string;

  @IsString({ message: 'Patient ID phải là chuỗi' })
  @IsNotEmpty({ message: 'Patient ID là bắt buộc' })
  @IsUUID('4', { message: 'Patient ID phải là UUID hợp lệ' })
  patient_id: string;

  @IsBoolean({ message: 'is_helpful phải là giá trị boolean' })
  @IsNotEmpty({ message: 'is_helpful là bắt buộc' })
  is_helpful: boolean;
}
