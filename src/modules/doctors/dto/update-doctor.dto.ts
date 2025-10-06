import { IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive, IsBoolean } from "class-validator";

export class UpdateDoctorDTO {

    @IsString({ message: 'Chuyên khoa phải là chuỗi' })
    @IsNotEmpty({ message: 'Chuyên khoa không được để trống' })
    specialty_name: string;

    @IsString({ message: 'Họ tên phải là chuỗi' })
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    full_name: string;

    
    @IsString({ message: 'Chức danh phải là chuỗi' })
    title?: string;

    @IsString({ message: 'Giới thiệu phải là chuỗi' })
    introduction?: string;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi (URL)' })
    avatar_url?: string;

    @IsString({ message: 'Chuyên môn phải là chuỗi' })
    specializations?: string;

    @IsString({ message: 'Kinh nghiệm làm việc phải là chuỗi' })
    work_experience?: string;

    @IsString({ message: 'Thành tựu phải là chuỗi' })
    achievements?: string;

    @IsNumber({}, { message: 'Số năm kinh nghiệm phải là số' })
    @IsPositive({ message: 'Số năm kinh nghiệm phải lớn hơn 0' })
    experience_years?: number;

}


export class UpdatePatchDoctorDTO {

    @IsOptional()
    @IsString({ message: 'Specialty ID phải là chuỗi' })
    @IsNotEmpty({ message: 'Specialty ID không được để trống' })
    specialty_name: string;

    @IsOptional()
    @IsString({ message: 'Họ tên phải là chuỗi' })
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    full_name: string;

    @IsOptional()
    @IsString({ message: 'Chức danh phải là chuỗi' })
    title?: string;

    @IsOptional()
    @IsString({ message: 'Giới thiệu phải là chuỗi' })
    introduction?: string;

    @IsOptional()
    @IsString({ message: 'Ảnh đại diện phải là chuỗi (URL)' })
    avatar_url?: string;

    @IsOptional()
    @IsString({ message: 'Chuyên môn phải là chuỗi' })
    specializations?: string;

    @IsOptional()
    @IsString({ message: 'Kinh nghiệm làm việc phải là chuỗi' })
    work_experience?: string;

    @IsOptional()
    @IsString({ message: 'Thành tựu phải là chuỗi' })
    achievements?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Số năm kinh nghiệm phải là số' })
    @IsPositive({ message: 'Số năm kinh nghiệm phải lớn hơn 0' })
    experience_years?: number;
}