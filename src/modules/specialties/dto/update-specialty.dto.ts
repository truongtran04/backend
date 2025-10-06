import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class UpdateSpecialtyDTO {

    @IsString({message: 'Tên chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Tên chuyên khoa không được để trống'})   
    name: string;

    @IsString({message: 'Mô tả chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mô tả chuyên khoa không được để trống'})
    description: string;

    @IsString({message: 'Ảnh chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Ảnh chuyên khoa không được để trống'})
    image_url: string;
}

export class UpdatePatchSpecialtyDTO {

    @IsOptional()
    @IsString({message: 'Tên chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Tên chuyên khoa không được để trống'})   
    name?: string;

    @IsOptional()
    @IsString({message: 'Mô tả chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Mô tả chuyên khoa không được để trống'})
    description?: string;

    @IsOptional()
    @IsString({message: 'Ảnh chuyên khoa phải là chuỗi ký tự'})
    @IsNotEmpty({message: 'Ảnh chuyên khoa không được để trống'})
    image_url?: string;
}