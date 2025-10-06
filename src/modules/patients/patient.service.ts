import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { PatientRepository } from "./patient.repository";
import { Patient } from '@prisma/client';
import { ValidateService } from "../validate/validate.service";
import { CreatePatientDTO } from "./dto/create-patient.dto";
import { UpdatePatientDTO } from "./dto/update-patient.dto";
import { SpecificationBuilder } from "src/classes/specification-builder.class";

@Injectable()
export class PatientService extends BaseService<PatientRepository, Patient> {
    private readonly patientLogger = new Logger(PatientService.name);

    constructor(
        private readonly patientRepository: PatientRepository,
        protected readonly prismaService: PrismaService,
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

    protected async beforeSave(id?: string, payload?: CreatePatientDTO | UpdatePatientDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('patient')
            .context({ primaryKey: 'patient_id', id })
            .unique('user_id', payload.user_id, "User_id đã tồn tại")
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
}