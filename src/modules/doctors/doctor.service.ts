import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Doctor } from '@prisma/client';
import { ValidateService } from "../validate/validate.service";
import { DoctorRepository } from "./doctor.repository";
import { CreateDoctorDTO } from "./dto/create-doctor.dto";
import { UpdateDoctorDTO, UpdatePatchDoctorDTO } from "./dto/update-doctor.dto";
import { UserService } from "../users/user.service";
import { SpecialtyService } from "../specialties/specialty.service";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class DoctorService extends BaseService<DoctorRepository, Doctor> {
    private readonly doctorLogger = new Logger(DoctorService.name);

    constructor(
        private readonly doctorRepository: DoctorRepository,
        protected readonly prismaService: PrismaService,
        private readonly userService: UserService,
        private readonly specialtyService: SpecialtyService,
        private readonly supabaseService: SupabaseService,
        private readonly validateService: ValidateService
    ){
        super(
            doctorRepository, 
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'created_at, desc', 
                searchFields: ['full_name', 'title'],
                simpleFilter: ['doctor_id', 'full_name'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: {
                    doctor_id: 'string',
                    full_name: 'string',
                }
            })
        )
    }

    protected async beforeSave(id?: string, payload?: CreateDoctorDTO | UpdateDoctorDTO): Promise<this>{
        if(!payload){
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('doctor')
            .context({ primaryKey: 'doctor_id', id })
            .validate()
    
        return Promise.resolve(this)
    }

    async createBasicDocTor(request: CreateDoctorDTO): Promise<Doctor>{

        if (!request) {
            throw new BadRequestException("Không có dữ liệu được gửi lên")
        }
        const user = await this.userService.createUserWithDoctor(request)
        const specialtyId = await this.specialtyService.getSpecialtyId(request.specialty_name)

        const folder: string = 'doctors'
        const { buffer, mimeType } = await this.supabaseService.decodeBase64ToBuffer(request.avatar_url)
        const ext = mimeType.split('/').pop() || 'jpg';
        const fileName = `${await this.supabaseService.normalizeFileName(request.full_name)}.${ext}`;

        const imageUrl = await this.supabaseService.uploadImage(folder, fileName, buffer, mimeType);


        const { email, specialty_name, ...dataWithoutEmail } = request;

        const data: Doctor = await this.save({
            ...dataWithoutEmail,
            user_id: user.user_id,
            specialty_id: specialtyId,
            avatar_url: imageUrl
        })

        return data
    }

    async active(id: string): Promise<{message: string}>{
        const user = await this.userService.findById(id)

        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng với id này');
        }

        const payload = {
            is_active: true
        }
        await this.userService.save(payload, user.user_id)

        const doctor = await this.findByField('user_id',user.user_id)

        if (!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ tương ứng với user này');
        }

        const isAvailable = {
            is_available: true
        }
        
        await this.save(isAvailable, doctor.doctor_id)

        return Promise.resolve({message: "Kích hoạt thành công"})

    }

    async update(request: UpdateDoctorDTO | UpdatePatchDoctorDTO, id: string): Promise<Doctor>{

        const doctor = await this.findById(id)
        if(!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ');
        }

        const specialtyId = await this.specialtyService.getSpecialtyId(request.specialty_name)

        const {specialty_name, ...dataWithoutspecialtyName } = request;

        const data: Doctor = await this.save({
            ...dataWithoutspecialtyName,
            specialty_id: specialtyId
        }, doctor.doctor_id)

        return data
    }
}