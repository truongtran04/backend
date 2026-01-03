import { IsString, IsOptional, IsBoolean, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(1, { message: 'Nội dung tin nhắn không được để trống' })
  content?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}