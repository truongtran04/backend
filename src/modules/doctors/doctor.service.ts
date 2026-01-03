import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Doctor } from '@prisma/client';
import { ValidateService } from "../validate/validate.service";
import { DoctorRepository } from "./doctor.repository";
import { CreateDoctorDTO, CreateDoctorWithoutEmailDTO } from "./dto/create-doctor.dto";
import { UpdateDoctorDTO, UpdatePatchDoctorDTO } from "./dto/update-doctor.dto";
import { UserService } from "../users/user.service";
import { SpecialtyService } from "../specialties/specialty.service";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { SupabaseService } from "../supabase/supabase.service";
import { RELATIONS } from "src/common/constants/relations.constant";
import axios from 'axios';

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
    ) {
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

    protected async beforeSave(id?: string, payload?: CreateDoctorDTO | UpdateDoctorDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('doctor')
            .context({ primaryKey: 'doctor_id', id })
            .validate()

        return Promise.resolve(this)
    }

    async createBasicDocTor(request: CreateDoctorDTO): Promise<Doctor> {

        if (!request) {
            throw new BadRequestException("Không có dữ liệu được gửi lên")
        }
        const user = await this.userService.createUserWithDoctor(request.email)
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

        const show = await this.show(data.doctor_id, RELATIONS.DOCTOR)

        return show
    }

    async active(id: string): Promise<{ message: string }> {
        const user = await this.userService.findById(id)

        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng với id này');
        }

        const payload = {
            is_active: true
        }
        await this.userService.save(payload, user.user_id)

        const doctor = await this.findByField('user_id', user.user_id)

        if (!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ tương ứng với user này');
        }

        const isAvailable = {
            is_available: true
        }

        await this.save(isAvailable, doctor.doctor_id)

        return Promise.resolve({ message: "Kích hoạt thành công" })

    }

    async update(request: UpdateDoctorDTO | UpdatePatchDoctorDTO, id: string): Promise<Doctor> {

        const doctor = await this.findById(id)
        if (!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ');
        }

        const specialtyId = await this.specialtyService.getSpecialtyId(request.specialty_name!)

        const { specialty_name, ...dataWithoutspecialtyName } = request;

        const data: Doctor = await this.save({
            ...dataWithoutspecialtyName,
            specialty_id: specialtyId
        }, doctor.doctor_id)

        return data
    }

    private async emailExists(email: string): Promise<boolean> {
        const user = await this.userService.findByEmail(email)
        return !!user;
    }

    private async generateUniqueGmail(fullName: string, usedEmailsInBatch: Set<string> = new Set()): Promise<string> {
        if (!fullName?.trim()) return '';

        const base = fullName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .toLowerCase();

        let email = `${base}@gmail.com`;
        let counter = 1;

        const isEmailAvailable = async (email: string): Promise<boolean> => {
            // Kiểm tra cả trong batch hiện tại và database
            return !usedEmailsInBatch.has(email) && !await this.emailExists(email);
        };

        // Thử email gốc
        if (await isEmailAvailable(email)) {
            usedEmailsInBatch.add(email);
            return email;
        }

        // Thử các email với số
        while (!await isEmailAvailable(email)) {
            email = `${base}${counter}@gmail.com`;
            counter++;

            if (counter > 100) {
                // Fallback: thêm timestamp
                const timestamp = Date.now();
                email = `${base}${timestamp}@gmail.com`;
                break;
            }
        }

        usedEmailsInBatch.add(email);
        return email;
    }



    private async imageUrlToBase64(url: string): Promise<string> {
        const response = await axios.get(url, {
            responseType: 'arraybuffer', // tải ảnh dạng nhị phân
        });

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const mimeType = response.headers['content-type']; // ví dụ: image/jpeg
        return `data:${mimeType};base64,${base64}`;
    }


    async createManyDoctors(request: CreateDoctorWithoutEmailDTO[]): Promise<Doctor[]> {
        if (!request?.length) {
            throw new BadRequestException("Không có dữ liệu được gửi lên");
        }

        const folder = 'doctors';
        const results: Doctor[] = [];
        const usedEmails = new Set<string>(); // Theo dõi email trong batch

        for (const item of request) {
            try {
                const email = await this.generateUniqueGmail(item.full_name, usedEmails);
                const user = await this.userService.createUserWithDoctor(email);

                const specialtyId = await this.specialtyService.getSpecialtyId(item.specialty_name);

                const imageBase64 = await this.imageUrlToBase64(item.avatar_url);
                const { buffer, mimeType } = await this.supabaseService.decodeBase64ToBuffer(imageBase64);
                const ext = mimeType.split('/').pop() || 'jpg';
                const fileName = `${await this.supabaseService.normalizeFileName(item.full_name)}.${ext}`;

                const imageUrl = await this.supabaseService.uploadImage(folder, fileName, buffer, mimeType);

                const { specialty_name, ...dataWithoutspecialtyName } = item;

                const created = await this.save({
                    ...dataWithoutspecialtyName,
                    user_id: user.user_id,
                    specialty_id: specialtyId,
                    avatar_url: imageUrl,
                    is_available: true,
                });

                const doctorResult = await this.show(created.doctor_id, RELATIONS.DOCTOR);
                results.push(doctorResult);

            } catch (error) {
                console.error(`Lỗi khi tạo bác sĩ ${item.full_name}:`, error);
                // Có thể thêm xử lý rollback hoặc tiếp tục với các item khác
                throw error; // hoặc continue nếu muốn bỏ qua lỗi
            }
        }

        return results;
    }
    async findDoctorsByName(nameInput: string) {
        // 1. Xử lý tên đầu vào: Bỏ tiền tố, cắt khoảng trắng thừa, gộp nhiều dấu cách thành 1
        const cleanName = nameInput
            .replace(/(bác sĩ|bs\.?|dr\.?)\s+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`🔎 Tìm bác sĩ với từ khóa: "${cleanName}"`);

        // 2. Query Database: Tìm những người có chứa CẢ CỤM TỪ này
        const candidates = await this.prismaService.doctor.findMany({
            where: {
                full_name: {
                    contains: cleanName, 
                    mode: 'insensitive'
                },
                is_available: true
            },
            include: {
                Specialty: true
            }
        });

        // 3. Lọc kỹ lại bằng Regex (Whole Word Search)
        const safeName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const regex = new RegExp(`(^|\\s)${safeName}(\\s|$)`, 'i');

        const exactMatches = candidates.filter(doc => {
            return regex.test(doc.full_name);
        });

        return exactMatches;
    }

    /**
     * Tìm bác sĩ khác cùng chuyên khoa đang rảnh vào giờ cụ thể
     */
    async findAlternativeDoctors(specialtyId: string, excludeDoctorId: string, timeSlot: Date) {
        return this.prismaService.doctor.findMany({
            where: {
                specialty_id: specialtyId, // Cùng chuyên khoa
                doctor_id: { not: excludeDoctorId }, // Trừ ông bác sĩ ban đầu ra
                // Kiểm tra xem bác sĩ này có lịch rảnh vào giờ đó không
                Schedules: {
                    some: {
                        start_time: timeSlot,
                        is_available: true
                    }
                }
            },
            take: 3 // Gợi ý tối đa 3 người
        });
    }

}