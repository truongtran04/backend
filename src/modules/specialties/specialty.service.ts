/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException, UnauthorizedException, Inject, Logger, NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { BaseService } from 'src/common/bases/base.service';
import { PrismaService } from "../../prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { TCastField } from 'src/classes/specification-builder.class';
import { SpecialtyRepository } from './specialty.repository';
import { Specialty } from '@prisma/client';
import { CreateSpecialtyDTO } from './dto/create-specialty.dto';
import { UpdatePatchSpecialtyDTO, UpdateSpecialtyDTO } from './dto/update-specialty.dto';
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SpecialtyService extends BaseService<SpecialtyRepository, Specialty> {

    private readonly serviceLogger = new Logger(SpecialtyService.name)

    constructor(
        private readonly specialtyRepository: SpecialtyRepository,
        protected readonly prismaService: PrismaService,
        private readonly supabaseService: SupabaseService,
        private readonly validateService: ValidateService
    ) {
        super(
            specialtyRepository,
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'created_at, desc',
                searchFields: ['name'],
                simpleFilter: ['specialty_id'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: { specialty_id: 'string' }
            })
        )
    }

    protected async beforeSave(id?: string, payload?: CreateSpecialtyDTO | UpdateSpecialtyDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('specialty')
            .context({ primaryKey: 'specialty_id', id })
            .unique('name', payload.name, "Chuyên ngành đã tồn tại")
            .validate()

        return Promise.resolve(this)
    }

    async getSpecialtyId(title: string): Promise<string> {

        const specialtyData = await this.findOneByField('name', title)
        return specialtyData.specialty_id
    }

    async create(request: CreateSpecialtyDTO): Promise<Specialty> {

        if (!request) {
            throw new BadRequestException("Không có dữ liệu được gửi lên")
        }

        const folder: string = 'specialties'
        const { buffer, mimeType } = await this.supabaseService.decodeBase64ToBuffer(request.image_url)
        const ext = mimeType.split('/').pop() || 'jpg';
        const fileName = `${await this.supabaseService.normalizeFileName(request.name)}.${ext}`;

        try {
            const imageUrl = await this.supabaseService.uploadImage(folder, fileName, buffer, mimeType);
            return await this.save({
                name: request.name,
                description: request.description,
                image_url: imageUrl,
            })
        } catch (err) {
            console.error('Lỗi thêm mới:', err);
            throw new BadRequestException('Lỗi khi thêm mới chuyên khoa');
        }
    }

    async update(request: UpdateSpecialtyDTO | UpdatePatchSpecialtyDTO, id: string): Promise<Specialty> {
        if (!request) {
            throw new BadRequestException("Không có dữ liệu được gửi lên");
        }

        const folder = 'specialties';
        const specialty = await this.findById(id);

        if (!specialty) {
            throw new BadRequestException("Không tìm thấy chuyên khoa");
        }

        let imageUrl = specialty.image_url;
        const oldFileName = specialty.image_url?.split('/').pop() || ''
        const oldExt = oldFileName.split('.').pop() || 'jpg'
        const oldPath = `${folder}/${oldFileName}`


        // Tên mới (nếu có)
        const newBaseName = await this.supabaseService.normalizeFileName(request.name!)
        const newFileName = `${newBaseName}.${oldExt}`
        const newPath = `${folder}/${newFileName}`

        try {

            // Đổi tên & ảnh mới
            if (request.image_url?.startsWith('data:image') && request.name !== specialty.name) {
                await this.supabaseService.deleteImage(specialty.image_url!)
                const { buffer, mimeType } = await this.supabaseService.decodeBase64ToBuffer(request.image_url);
                const ext = mimeType.split('/').pop() || oldExt;
                const finalFileName = `${newBaseName}.${ext}`;
                imageUrl = await this.supabaseService.uploadImage(folder, finalFileName, buffer, mimeType);
            }

            // Chỉ đổi ảnh, không đổi tên
            else if (request.image_url?.startsWith('data:image')) {
                const isChanged = await this.supabaseService.isImageChanged(specialty.image_url!, request.image_url);

                if (isChanged) {
                    const { buffer, mimeType } = await this.supabaseService.decodeBase64ToBuffer(request.image_url);
                    const ext = mimeType.split('/').pop() || 'jpg';
                    const timestamp = Date.now();
                    const finalFileName = `${newBaseName}_${timestamp}.${ext}`;

                    if (specialty.image_url) {
                        await this.supabaseService.deleteImage(specialty.image_url);
                    }

                    imageUrl = await this.supabaseService.uploadImage(folder, finalFileName, buffer, mimeType);
                } else {
                    imageUrl = specialty.image_url;
                }
            }

            // Chỉ đổi tên
            else if (request.name && request.name !== specialty.name) {
                imageUrl = await this.supabaseService.renameImage(oldPath, newPath);
            }

            // Không đổi gì → giữ nguyên
            const updated = await this.save({
                ...specialty,
                name: request.name ?? specialty.name,
                description: request.description ?? specialty.description,
                image_url: imageUrl,
            }, id);

            return updated;
        } catch (err) {
            console.error('Lỗi khi cập nhật chuyên khoa:', err);
            throw new BadRequestException('Không thể cập nhật chuyên khoa');
        }
    }


    async delete(id: string): Promise<{ message: string }> {
        const specialty = await this.findById(id);

        if (!specialty) {
            throw new BadRequestException("Không tìm thấy chuyên khoa");
        }

        await this.supabaseService.deleteImage(specialty.image_url!)
        await this.destroy(id)

        return Promise.resolve({ message: 'Xóa bản ghi thành công' })
    }
}
