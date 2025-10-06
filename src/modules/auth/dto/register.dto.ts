import { IsEmail, IsString, IsNotEmpty, MinLength } from "class-validator";
import { IsMatch } from "src/common/decorators/match.decorator";

export class RegisterDTO {
    @IsEmail({}, {message: 'Email không hợp lệ'})
    @IsString({message: 'Email phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Email không được để trống'})
    email: string;

    @IsString({message: 'Mật khẩu phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mật khẩu không được để trống'})
    @MinLength(8, {message: 'Mật khẩu phải có ít nhất 8 ký tự'})
    password: string;

    @IsString({message: 'Mật khẩu phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mật khẩu không được để trống'})
    @IsMatch( 'password', { message: 'Mật khẩu không trùng khớp' })
    confirmPassword: string;
}