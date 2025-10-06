import { IsNotEmpty, IsString, IsEmail, MinLength, IsBoolean, IsEnum, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export enum UserRole {
  ADMIN = 'admin',
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

export class UpdateUserDTO {

    @IsEmail({}, {message: 'Email không hợp lệ'})
    @IsString({message: 'Email phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Email không được để trống'})
    email: string;
    
    @IsString({message: 'Mật khẩu phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mật khẩu không được để trống'})
    @MinLength(8, {message: 'Mật khẩu phải có ít nhất 8 ký tự'})
    password: string;

    @IsEnum(UserRole, { message: 'Role không hợp lệ' })
    role: UserRole;

    @Type(() => Boolean)
    @IsBoolean({ message: 'isActive phải là kiểu boolean' })
    is_active: boolean;
    
}

export class UpdatePatchUserDTO {

    @IsOptional()
    @IsEmail({}, {message: 'Email không hợp lệ'})
    @IsString({message: 'Email phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Email không được để trống'})
    email?: string;

    @IsOptional()
    @IsString({message: 'Mật khẩu phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mật khẩu không được để trống'})
    @MinLength(8, {message: 'Mật khẩu phải có ít nhất 8 ký tự'})
    password?: string;

    @IsOptional()
    @IsEnum(UserRole, { message: 'Role không hợp lệ' })
    role?: UserRole;

    @IsOptional() 
    @Type(() => Boolean)
    @IsBoolean({ message: 'isActive phải là kiểu boolean' })
    is_active?: boolean;
    
}