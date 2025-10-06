import { IsNotEmpty, IsString, IsEnum, IsDateString, Matches, MinLength, IsOptional } from "class-validator";

export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    OTHER = 'other'
}

export class CreatePatientDTO {

    @IsNotEmpty({ message: 'User_id không được để trống' })   
    user_id: string;

    @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Họ và tên không được để trống' })
    full_name: string;

    @IsString({ message: 'CMND/CCCD phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'CMND/CCCD không được để trống' })
    @MinLength(10, { message: 'CMND/CCCD phải từ 9 đến 12 ký tự' })
    identity_number: string;

    @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    @Matches(/^(0|\+84)\d{9}$/, { message: 'Số điện thoại không hợp lệ' })
    phone_number: string;

    @IsDateString({}, { message: 'Ngày sinh phải đúng định dạng (YYYY-MM-DD)' })
    @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
    date_of_birth: Date;

    @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
    @IsNotEmpty({ message: 'Giới tính không được để trống' })
    gender: Gender;

    
    @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
    address: string;

    @IsString({ message: 'Dân tộc phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Dân tộc không được để trống' })
    ethnicity: string;

    @IsString({ message: 'Số thẻ BHYT phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Số thẻ BHYT không được để trống' })
    @MinLength(10, { message: 'Số thẻ BHYT phải từ 10 đến 15 ký tự' })
    health_insurance_number: string;

    @IsString({ message: 'Mã giới thiệu phải là chuỗi ký tự' })
    referral_code: string;

    @IsString({ message: 'Nghề nghiệp phải là chuỗi ký tự' })
    occupation: string;
}
