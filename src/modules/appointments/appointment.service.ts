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
    ){
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

    protected async beforeSave(id?: string, payload?: CreateAppointmentDTO | UpdateAppointmentDTO): Promise<this>{
        if(!payload){
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('appointment')
            .context({ primaryKey: 'appointment_id', id })
            .validate()
    
        return Promise.resolve(this)
    }

    private async getPatientId(payload: IAuthUser): Promise<string>{

        const user = await this.userService.findById(payload.userId)
        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng với id này');
        }

        const patient = await this.patientService.findByField('user_id',user.user_id)
        if (!patient) {
            throw new BadRequestException('Không tìm thấy bệnh nhân tương ứng với user này');
        }

        return patient.patient_id
    }

    async createAppointment(payload: IAuthUser, request: CreateAppointmentDTO): Promise<Appointment> {
        
        const patientId = await this.getPatientId(payload)
        console.log(patientId);
        

        const existing = await this.findByField('schedule_id', request.schedule_id)

        if(existing) {
            throw new BadRequestException("Lịch khám đã tồn tại")
        }

        const doctor = await this.doctorService.findById(request.doctor_id)

        if(!doctor || doctor.is_available === false) {
            throw new BadRequestException("Không tìm bác sĩ")
        }

        const schedule = await this.scheduleService.findById(request.schedule_id)

        if(!schedule|| schedule.is_available === false) {
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

        return data
    }

    private async checkValidateAppointment(id: string, payload: IAuthUser): Promise<Appointment> {
        const doctor = await this.doctorService.findById(payload.userId);
        if (!doctor){
            throw new BadRequestException("Không tìm thấy bác sĩ");
        } 

        const appointment = await this.findById(id);
        if (!appointment){
            throw new BadRequestException("Không tìm thấy cuộc hẹn");
        } 

        // Lấy schedule của appointment
        const schedule = await this.scheduleService.findById(appointment.schedule_id);
        
        if (!schedule || schedule.doctor_id !== doctor.doctor_id) {
            throw new BadRequestException("Bác sĩ không có lịch khám cho cuộc hẹn này");
        }

        if (appointment.status !== 'pending') {
            throw new BadRequestException(`Cuộc hẹn đã ${appointment.status}`);
        }

        return appointment
    }

    async updateAppointmentStatus(id: string, payload: IAuthUser, statusMessage: StatusMessage ): Promise<{message: string}> {

        const appointment = await this.checkValidateAppointment(id, payload)

        await this.save({ status: statusMessage.status }, appointment.appointment_id);

        if(statusMessage.status === AppointmentStatus.CANCEL) {

             const isAvailable = {
                is_available: true
            }

            await this.scheduleService.save(isAvailable, appointment.schedule_id)
        }

        return { message: statusMessage.message };
    }

    async getAppointmentBySchedule(id: string): Promise<Appointment> {
        const appointment = await this.findByField('schedule_id', id)

        if(!appointment) {
            throw new BadRequestException('Không có lịch khám này')
        }

        const data = await this.show(appointment.appointment_id, RELATIONS.APPOINTMENT)
        
        return data
    }

}