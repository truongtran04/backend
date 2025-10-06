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
    title: string;

    @IsString({ message: 'Giới thiệu phải là chuỗi' })
    introduction: string;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi (URL)' })
    avatar_url: string;

    @IsString({ message: 'Chuyên môn phải là chuỗi' })
    specializations: string;

    @IsString({ message: 'Kinh nghiệm làm việc phải là chuỗi' })
    work_experience: string;

    @IsString({ message: 'Thành tựu phải là chuỗi' })
    achievements: string;

    @IsNumber({}, { message: 'Số năm kinh nghiệm phải là số' })
    @IsPositive({ message: 'Số năm kinh nghiệm phải lớn hơn 0' })
    experience_years: number;

    @IsBoolean({ message: 'Trạng thái phải là true/false' })
    is_available: boolean;
}