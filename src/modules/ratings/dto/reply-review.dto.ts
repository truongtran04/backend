import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ReplyReviewDTO {
  @IsString({ message: 'Phản hồi phải là chuỗi' })
  @IsNotEmpty({ message: 'Phản hồi là bắt buộc' })
  @MinLength(1, { message: 'Phản hồi phải có ít nhất 1 ký tự' })
  @MaxLength(1000, { message: 'Phản hồi không được vượt quá 1000 ký tự' })
  reply: string;
}

