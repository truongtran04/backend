import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString({ message: 'Prompt phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Prompt không được để trống' })
  prompt: string;
}