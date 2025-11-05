import { PartialType } from "@nestjs/mapped-types";
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive, IsBoolean } from "class-validator";

export class UpdateDoctorDTO {

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

    specializations: string;

    @IsString({ message: 'Vị trí hoặc chức vụ phải là chuỗi' })
    @IsNotEmpty({message: 'Vị trí hoặc chức vụ không được để trống'})
    position: string;

    @IsString({ message: 'Nơi làm việc chính phải là chuỗi' })
    @IsNotEmpty({message: 'Nơi làm việc chính không được để trống'})
    workplace: string;

    @IsString({ message: 'Địa chỉ phòng khám hoặc nơi tiếp bệnh phải là chuỗi' })
    @IsNotEmpty({message: 'Địa chỉ phòng khám hoặc nơi tiếp bệnh không được để trống'})
    clinic_address: string;

    introduction: string;

    achievements: string;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi (URL)' })
    @IsNotEmpty({message: 'Ảnh đại diện không được để trống'})
    avatar_url: string;

}

export class UpdatePatchDoctorDTO extends PartialType(UpdateDoctorDTO) {}
