import { Inject, Injectable, Logger, BadRequestException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ValidateService } from "../validate/validate.service";
import { AppointmentRepository } from "./appointment.repository";
import { CreateAppointmentDTO } from "./dto/create-appointment.dto";
import { UpdateAppointmentDTO } from "./dto/update-appointment.dto";
import { Appointment } from "@prisma/client";
import { IAuthUser } from "../auth/auth.interface";
import { UserService } from "../users/user.service";
import { DoctorService } from "../doctors/doctor.service";
import { PatientService } from "../patients/patient.service";
import { ScheduleService } from "../schedules/schedule.service";
import { StatusMessage, AppointmentStatus } from "./appointment.interface";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { RELATIONS } from 'src/common/constants/relations.constant';
import { Patient } from '@prisma/client';
import { log } from "console";
import { APPOINTMENT_TRANSITIONS } from "./appointment.constants";

@Injectable()
export class AppointmentService extends BaseService<AppointmentRepository, Appointment> {
    private readonly appointmentLogger = new Logger(AppointmentService.name);

    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        protected readonly prismaService: PrismaService,
        private readonly validateService: ValidateService,
        private readonly userService: UserService,
        private readonly doctorService: DoctorService,
        private readonly patientService: PatientService,
        private readonly scheduleService: ScheduleService,
    ) {
        super(
            appointmentRepository,
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'created_at, desc',
                simpleFilter: ['doctor_id', 'patient_id', 'status'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: {
                    doctor_id: 'string',
                    patient_id: 'string',
                    status: 'boolean',
                }
            })
        )
    }

    protected async beforeSave(id?: string, payload?: CreateAppointmentDTO | UpdateAppointmentDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('appointment')
            .context({ primaryKey: 'appointment_id', id })
            .validate()

        return Promise.resolve(this)
    }

    private async getPatientId(payload: IAuthUser): Promise<string> {
        // Lấy thông tin bệnh nhân trực tiếp từ user_id trong payload.
        // Giả định patientService có phương thức findByField hoặc tương tự.
        const patient = await this.patientService.findFirst({ user_id: payload.userId });

        // Nếu không tìm thấy hồ sơ bệnh nhân nào được liên kết với tài khoản người dùng này,
        // đưa ra một lỗi rõ ràng.
        if (!patient) {
            throw new BadRequestException('Không tìm thấy hồ sơ bệnh nhân cho tài khoản này.');
        }

        return patient.patient_id
    }

    async createAppointment(payload: IAuthUser, request: CreateAppointmentDTO): Promise<Appointment> {

        const patientId = await this.getPatientId(payload)
        
        const existing = await this.findByField('schedule_id', request.schedule_id)

        if (existing) {
            throw new BadRequestException("Lịch khám đã tồn tại")
        }

        const doctor = await this.doctorService.findById(request.doctor_id)

        if (!doctor || doctor.is_available === false) {
            throw new BadRequestException("Không tìm bác sĩ")
        }

        const schedule = await this.scheduleService.findById(request.schedule_id)

        if (!schedule || schedule.is_available === false) {
            throw new BadRequestException("Không tìm thấy lịch của bác sĩ")
        }

        const data: Appointment = await this.save({
            patient_id: patientId,
            ...request
        })

        const isAvailable = {
            is_available: false
        }

        await this.scheduleService.save(isAvailable, schedule.schedule_id)

        // Sau khi lưu, cần tìm lại bản ghi vừa tạo và tải kèm các mối quan hệ cần thiết
        // để quá trình transform dữ liệu trả về không bị lỗi.
        const createdAppointmentWithRelations = await this.show(data.appointment_id, RELATIONS.APPOINTMENT);
        if (!createdAppointmentWithRelations) {
            throw new BadRequestException("Không thể tìm thấy lịch hẹn vừa tạo với các thông tin liên quan.");
        }
        return createdAppointmentWithRelations;
    }

    private async checkValidateAppointment(id: string, payload: IAuthUser, nextStatus: AppointmentStatus): Promise<Appointment> {
        const doctor = await this.doctorService.findByField('user_id', payload.userId);
        if (!doctor) {
            throw new BadRequestException("Không tìm thấy bác sĩ");
        }

        const appointment = await this.findById(id);
        if (!appointment) {
            throw new BadRequestException("Không tìm thấy cuộc hẹn");
        }

        const schedule = await this.scheduleService.findById(appointment.schedule_id);

        if (!schedule || schedule.doctor_id !== doctor.doctor_id) {
            throw new BadRequestException("Bác sĩ không có lịch khám cho cuộc hẹn này");
        }

        const allowedNextStatuses =
            APPOINTMENT_TRANSITIONS[appointment.status as AppointmentStatus];

        if (!allowedNextStatuses.includes(nextStatus)) {
            throw new BadRequestException(
                `Không thể chuyển cuộc hẹn từ ${appointment.status} sang ${nextStatus}`
            );
        }


        return appointment
    }

    async updateAppointmentStatus(id: string, payload: IAuthUser, statusMessage: StatusMessage): Promise<{ message: string }> {

        const appointment = await this.checkValidateAppointment(id, payload, statusMessage.status)

        await this.save({ status: statusMessage.status }, appointment.appointment_id);

        if (statusMessage.status === AppointmentStatus.CANCEL) {

            const isAvailable = {
                is_available: true
            }

            await this.scheduleService.save(isAvailable, appointment.schedule_id)
        }

        return { message: statusMessage.message };
    }

    async getAppointmentBySchedule(id: string): Promise<Appointment> {
        const appointment = await this.findByField('schedule_id', id)

        if (!appointment) {
            throw new BadRequestException('Không có lịch khám này')
        }

        const data = await this.show(appointment.appointment_id, RELATIONS.APPOINTMENT)

        return data
    }

    /**
     * Helper to get patient profile from user ID
     * @param userId The user ID from JWT
     * @returns Patient profile or null
     */
    async getPatientProfile(userId: string): Promise<Patient | null> {
        return this.patientService.findFirst({ user_id: userId });
    }

}