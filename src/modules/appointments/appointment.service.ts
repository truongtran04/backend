import { Injectable, Logger, BadRequestException } from "@nestjs/common";
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

        // Sau khi lưu, cần tìm lại bản ghi vừa tạo và tải kèm các mối quan hệ cần thiết
        // để quá trình transform dữ liệu trả về không bị lỗi.
        const createdAppointmentWithRelations = await this.show(data.appointment_id, RELATIONS.APPOINTMENT);
        if (!createdAppointmentWithRelations) {
            throw new BadRequestException("Không thể tìm thấy lịch hẹn vừa tạo với các thông tin liên quan.");
        }
        return createdAppointmentWithRelations;
    }
    
    async createAppointmentFromPy(userId: number, doctorName: string, timeString: string) {
        
        // 1. Tìm Bác sĩ (Logic cũ)
        const doctors = await this.doctorService.findDoctorsByName(doctorName);
        if (!doctors || doctors.length === 0) {
            return { type: 'TEXT', message: `Không tìm thấy bác sĩ nào tên là "${doctorName}".` };
        }
        const doctor = doctors[0]; 

        // 2. Tìm Schedule
        const requestTime = new Date(timeString);
        if (isNaN(requestTime.getTime())) return { type: 'TEXT', message: 'Thời gian không hợp lệ.' };

        const availableSchedule = await this.scheduleService.findAvailableSlot(
            doctor.doctor_id, 
            requestTime
        );

        // --- LOGIC MỚI: XỬ LÝ KHI BÁC SĨ BẬN ---
        // ... (Đoạn tìm schedule bên trên) ...

        // --- XỬ LÝ KHI BÁC SĨ BẬN (GỢI Ý THAY THẾ) ---
        if (!availableSchedule) {
            const timeStringDisplay = requestTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            
            let suggestionMessage = `Rất tiếc, BS ${doctor.full_name} đã kín lịch lúc ${timeStringDisplay}.`;
            
            const suggestions: string[] = [];

            // 1. Tìm giờ khác của CÙNG bác sĩ (Trong cùng ngày)
            const altSlots = await this.scheduleService.findAlternativeSlots(doctor.doctor_id, requestTime);
            
            if (altSlots && altSlots.length > 0) {
                const timeList = altSlots
                    .map(s => new Date(s.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}))
                    .join(", ");
                
                suggestions.push(`\nGiờ khác cùng ngày của BS ${doctor.full_name}: ${timeList}`);
            }

            // 2. Tìm bác sĩ KHÁC cùng chuyên khoa (Rảnh vào giờ đó)
            if (doctor.specialty_id) {
                const altDoctors = await this.doctorService.findAlternativeDoctors(
                    doctor.specialty_id, 
                    doctor.doctor_id, // Loại trừ bác sĩ hiện tại
                    requestTime
                );

                if (altDoctors && altDoctors.length > 0) {
                    const docList = altDoctors.map(d => d.full_name).join(", ");
                    
                    // Push câu gợi ý bác sĩ vào mảng
                    suggestions.push(`\nBác sĩ khác rảnh lúc đó: ${docList}`);
                }
            }

            // 3. Tổng hợp thông báo trả về
            if (suggestions.length > 0) {
                suggestionMessage += "\n\nBạn có muốn đổi sang các lựa chọn sau không?" + suggestions.join("");
                
                return { 
                    type: 'BOOKING_SUGGESTION', 
                    message: suggestionMessage
                };
            } else {
                return { 
                    type: 'TEXT', 
                    message: `Rất tiếc, BS ${doctor.full_name} đã kín lịch và hệ thống cũng không tìm thấy bác sĩ thay thế phù hợp vào khung giờ này. Vui lòng chọn ngày khác.` 
                };
            }
        }
    // 3. Giả lập IAuthUser (Vì hàm createAppointment cần nó)
    const mockAuthUser: IAuthUser = {
        userId: userId.toString(),
        guard: 'user',
        role: 'patient' 
    };

    // 4. Tạo DTO chuẩn
    const dto = new CreateAppointmentDTO();
    dto.doctor_id = doctor.doctor_id;
    dto.schedule_id = availableSchedule.schedule_id; // Lấy ID lịch tìm được ở bước 2
    dto.status = AppointmentStatus.PENDING; // Mặc định là chờ xác nhận
    dto.notes = 'Đặt lịch qua AI Chatbot';
    
    // 5. Gọi lại hàm logic chính (Tái sử dụng code cũ)
    try {
        const newAppointment = await this.createAppointment(mockAuthUser, dto);
        
        return {
            type: 'BOOKING_SUCCESS',
            message: `Đã đặt lịch thành công với BS ${doctor.full_name}!`,
            data: newAppointment
        };
    } catch (error) {
        console.error(error);
 return { type: 'TEXT', message: `Có lỗi khi tạo lịch hẹn: ${error.message}` };
    }
  }

    async suggestAppointmentTimes(doctorName: string) {
        // 1. Tìm bác sĩ
        const doctors = await this.doctorService.findDoctorsByName(doctorName);
        if (!doctors || doctors.length === 0) {
            return { type: 'TEXT', message: `Không tìm thấy bác sĩ nào tên là "${doctorName}".` };
        }
        
        const doctor = doctors[0];

        // 2. Tìm lịch rảnh sắp tới
        const upcomingSlots = await this.scheduleService.findUpcomingSlots(doctor.doctor_id);

        if (!upcomingSlots || upcomingSlots.length === 0) {
            return { 
                type: 'TEXT', 
                message: `Hiện tại BS ${doctor.full_name} chưa có lịch trống nào trong thời gian tới. Vui lòng quay lại sau.` 
            };
        }

        // 3. Format hiển thị cho đẹp
        const groupedSlots = {};
        
        upcomingSlots.forEach(slot => {
            const dateStr = new Date(slot.start_time).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
            const timeStr = new Date(slot.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            
            if (!groupedSlots[dateStr]) groupedSlots[dateStr] = [];
            groupedSlots[dateStr].push(timeStr);
        });

        // Tạo chuỗi tin nhắn
        let msg = `Chào bạn, BS ${doctor.full_name} hiện còn trống các khung giờ sau:\n`;
        for (const [date, times] of Object.entries(groupedSlots)) {
            msg += `Ngày ${date}: ${(times as string[]).join(', ')}\n`;
        }
        msg += `\nBạn muốn chốt giờ nào? (Ví dụ: "Đặt 9:30 ngày 03/01")`;

        return {
            type: 'BOOKING_SUGGESTION', // Frontend có thể hiển thị nút bấm giờ
            message: msg,
            data: {
                doctor: doctor,
                slots: upcomingSlots
            }
        };
    }
  
    /**
     * Gợi ý danh sách bác sĩ rảnh theo giờ người dùng chọn
     */
    async suggestDoctorsByTime(timeString: string) {
        const requestTime = new Date(timeString);
        
        if (isNaN(requestTime.getTime())) {
            return { type: 'TEXT', message: 'Thời gian không hợp lệ.' };
        }

        // 1. Gọi ScheduleService tìm lịch
        const schedules = await this.scheduleService.findSchedulesByTime(requestTime);

        // 2. Nếu không có ai rảnh
        if (!schedules || schedules.length === 0) {
            const timeDisplay = requestTime.toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});
            return { 
                type: 'TEXT', 
                message: `Rất tiếc, không có bác sĩ nào rảnh vào lúc ${timeDisplay}. Bạn vui lòng chọn khung giờ khác.` 
            };
        }

        // 3. Format danh sách bác sĩ để hiển thị
        // schedules chứa mảng các lịch, từ lịch lấy ra thông tin bác sĩ
        const doctorList = schedules.map(sch => {
            const doc = sch.Doctor;
            const specialtyName = doc.Specialty ? doc.Specialty.name : 'Đa khoa';
            return `- **BS ${doc.full_name}** (${specialtyName})`;
        }).join("\n");

        const timeDisplay = requestTime.toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});

        return {
            type: 'DOCTOR_SUGGESTION', // Type mới để Frontend biết hiển thị dạng list chọn
            message: `Vào lúc ${timeDisplay}, hệ thống tìm thấy các bác sĩ sau đang rảnh:\n\n${doctorList}\n\nBạn muốn đặt với bác sĩ nào? (Gõ "Đặt với BS [Tên]" để chốt)`,
            data: schedules.map(s => s.Doctor) // Trả về data raw để FE xử lý nếu cần
        };
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

    /**
     * Helper to get patient profile from user ID
     * @param userId The user ID from JWT
     * @returns Patient profile or null
     */
    async getPatientProfile(userId: string): Promise<Patient | null> {
        return this.patientService.findFirst({ user_id: userId });
    }

}