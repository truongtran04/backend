import { IsEmail, IsString, IsNotEmpty, } from "class-validator";

export class ForgotPasswordDTO {
    @IsEmail({}, {message: 'Email không hợp lệ'})
    @IsString({message: 'Email phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Email không được để trống'})
    email: string;
}