import { OmitType } from "@nestjs/mapped-types";
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, IsPositive, IsBoolean } from "class-validator";

export class CreateDoctorDTO {

    @IsEmail({}, {message: 'Email không hợp lệ'})
    @IsString({message: 'Email phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Email không được để trống'})
    email: string;

    @IsString({ message: 'Chuyên khoa phải là chuỗi' })
    @IsNotEmpty({ message: 'Chuyên khoa không được để trống' })
    specialty_name: string;

    @IsString({ message: 'Họ tên phải là chuỗi' })
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    full_name: string;

    @IsString({ message: 'Chức danh phải là chuỗi' })
    @IsNotEmpty({message: 'Chức danh không được để trống'})
    title: string;

    @IsNumber({}, { message: 'Số năm kinh nghiệm phải là số' })
    @IsPositive({ message: 'Số năm kinh nghiệm phải lớn hơn 0' })
    @IsNotEmpty({message: 'Số năm kinh nghiệm không được để trống'})
    experience_years: number;

    @IsOptional()
    specializations: string;

    @IsOptional()
    position: string;

    @IsOptional()
    workplace: string;

    @IsOptional()
    clinic_address: string;

    @IsOptional()
    introduction: string;

    @IsOptional()   
    achievements: string;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi (URL)' })
    @IsNotEmpty({message: 'Ảnh đại diện không được để trống'})
    avatar_url: string;

    @IsBoolean({ message: 'Trạng thái phải là true/false' })
    is_available: boolean;
}

export class CreateDoctorWithoutEmailDTO extends OmitType(CreateDoctorDTO, [
  'email',
  'is_available',
] as const) {}