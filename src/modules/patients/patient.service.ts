import { Inject, Injectable, Logger, BadRequestException, forwardRef } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { PatientRepository } from "./patient.repository";
import { Doctor, Patient, User } from '@prisma/client';
import { ValidateService } from "../validate/validate.service";
import { CreatePatientDTO } from "./dto/create-patient.dto";
import { UpdatePatchPatientDTO, UpdatePatientDTO } from "./dto/update-patient.dto";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { UserService } from "../users/user.service";
import { RELATIONS } from "src/common/constants/relations.constant";

@Injectable()
export class PatientService extends BaseService<PatientRepository, Patient> {
    private readonly patientLogger = new Logger(PatientService.name);

    constructor(
        private readonly patientRepository: PatientRepository,
        protected readonly prismaService: PrismaService,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly validateService: ValidateService
    ) {
        super(
            patientRepository,
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'created_at, desc',
                searchFields: ['full_name'],
                simpleFilter: ['patient_id', 'full_name'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: {
                    patient_id: 'string',
                    full_name: 'string',
                }
            })
        )
    }

    protected async prepareModelData<P>(payload: P): Promise<this> {
        const transformedPayload = { ...payload } as any;
        
        // Transform date_of_birth from string to Date object if it exists
        if (transformedPayload.date_of_birth && typeof transformedPayload.date_of_birth === 'string') {
            // If it's YYYY-MM-DD format (10 characters), convert to Date
            if (transformedPayload.date_of_birth.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(transformedPayload.date_of_birth)) {
                transformedPayload.date_of_birth = new Date(transformedPayload.date_of_birth + 'T00:00:00.000Z');
            } else {
                transformedPayload.date_of_birth = new Date(transformedPayload.date_of_birth);
            }
        }
        
        return super.prepareModelData(transformedPayload);
    }

    protected async beforeSave(id?: string, payload?: CreatePatientDTO | UpdatePatientDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('patient')
            .context({ primaryKey: 'patient_id', id })
            .validate()

        return Promise.resolve(this)
    }

    async createBasicPatient(id: string): Promise<Patient> {
        return await this.save({
            user_id: id,
            full_name: '',
            identity_number: null,
            phone_number: '',
            date_of_birth: new Date(),
            gender: 'other' as any,
            address: '',
            ethnicity: '',
            health_insurance_number: '',
            referral_code: '',
            occupation: ''
        })
    }


    async update(request: UpdatePatientDTO | UpdatePatchPatientDTO, id: string): Promise<Patient> {

        const patient = await this.findById(id)
        if (!patient) {
            throw new BadRequestException('Không tìm thấy người dùng');
        }

        const user = await this.userService.findById(patient.user_id)
        if (!user) {
            throw new BadRequestException('Không tìm tài khoản');
        }

        if(request.email){
            await this.userService.save({
                email: request.email
            }, user.user_id)
        }

        const { email, ...dataWithoutEmail } = request

        if(Object.keys(dataWithoutEmail).length === 0){
            return await this.show(patient.patient_id, RELATIONS.PATIENT)
        }

        const data: Patient = await this.save({
            ...dataWithoutEmail,
        }, patient.patient_id)


        const show = await this.show(data.patient_id, RELATIONS.PATIENT)

        return show
    }

    async getUserIdByPatientId(patientId: string): Promise<string> {
        const patient = await this.findById(patientId)
        if (!patient) {
            throw new BadRequestException('Không tìm thấy bệnh nhân với id này');
        }
        return patient.user_id
    }

    async findByUserId(userId: string): Promise<string> {
        const patient = await this.patientRepository.findByField('user_id', userId)

        if (!patient) {
            throw new BadRequestException('Không tìm thấy bệnh nhân với id này');
        }

        return patient.patient_id
    }
}