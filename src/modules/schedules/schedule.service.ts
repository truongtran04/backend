import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseService } from 'src/common/bases/base.service';
import { PrismaService } from "../../prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { AppointmentStatus, DoctorSchedule } from '@prisma/client';
import { ScheduleRepository } from './schedule.repository';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { UpdateScheduleDTO } from './dto/update-schedule.dto';
import { IAuthUser } from '../auth/auth.interface';
import { UserService } from '../users/user.service';
import { DoctorService } from '../doctors/doctor.service';
import { ScheduleRequest, ScheduleUTC } from './schedule.interface';
import { RELATIONS } from 'src/common/constants/relations.constant';
import { SpecificationBuilder } from 'src/classes/specification-builder.class';

@Injectable()
export class ScheduleService extends BaseService<ScheduleRepository, DoctorSchedule> {

    private readonly serviceLogger = new Logger(ScheduleService.name);

    constructor(
        private readonly scheduleRepository: ScheduleRepository,
        protected readonly prismaService: PrismaService,
        private readonly validateService: ValidateService,
        private readonly userService: UserService,
        private readonly doctorService: DoctorService,
    ) {
        super(
            scheduleRepository,
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'start_time,asc',
                searchFields: ['schedule_date', 'doctor_id'],
                simpleFilter: ['doctor_id', 'is_available'],
                dateFilter: ['schedule_date', 'created_at', 'updated_at'],
                fieldTypes: {
                    doctor_id: 'string',
                    is_available: 'boolean',
                }
            })
        );
    }

    protected async beforeSave(id?: string, payload?: CreateScheduleDTO | UpdateScheduleDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ');
        }
        await this.validateService.model('doctorSchedule')
            .context({ primaryKey: 'schedule_id', id })
            .validate();

        return Promise.resolve(this);
    }

    async getDoctorId(payload: IAuthUser): Promise<string> {
        const user = await this.userService.findById(payload.userId);
        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng với id này');
        }

        const doctor = await this.doctorService.findByField('user_id', user.user_id);
        if (!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ tương ứng với user này');
        }

        return doctor.doctor_id;
    }


    async getAvailableDates(
        doctorId: string,
        fromDate?: string,
        toDate?: string,
        availableOnly: boolean = true
    ): Promise<string[]> {
        try {
            // Parse dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = fromDate 
                ? this.parseDate(fromDate)
                : today;

            const defaultEndDate = new Date(today);
            defaultEndDate.setDate(defaultEndDate.getDate() + 30);

            const endDate = toDate
                ? this.parseDate(toDate)
                : defaultEndDate;

            this.serviceLogger.log(`Getting available dates for doctor ${doctorId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

            // Query schedules using Prisma directly
            const whereClause: any = {
                doctor_id: doctorId,
                schedule_date: {
                    gte: startDate,
                    lte: endDate,
                },
            };

            if (availableOnly) {
                whereClause.is_available = true;
            }

            // ✅ FIXED: Use repository or prisma directly instead of findAll
            const schedules = await this.prismaService.doctorSchedule.findMany({
                where: whereClause,
                orderBy: {
                    schedule_date: 'asc'
                }
    
            });

            this.serviceLogger.log(`Found ${schedules.length} schedules`);

            // Extract unique dates and format as YYYY-MM-DD
            const uniqueDates = new Set<string>();
            
            schedules.forEach(schedule => {
                const date = new Date(schedule.schedule_date);
                const formatted = this.formatDateToYYYYMMDD(date);
                uniqueDates.add(formatted);
            });

            const result = Array.from(uniqueDates).sort();
            
            this.serviceLogger.log(`Returning ${result.length} unique dates: ${result.join(', ')}`);

            return result;
        } catch (error) {
            this.serviceLogger.error(`Error getting available dates: ${error.message}`, error.stack);
            throw new BadRequestException(`Không thể lấy danh sách ngày: ${error.message}`);
        }
    }

    async findAvailableSlot(doctorId: string, requestTime: Date): Promise<DoctorSchedule | null> {
        try {
            this.serviceLogger.log(`Finding available slot for Doctor ${doctorId} at ${requestTime.toISOString()}`);

            // Logic:
            // 1. Đúng bác sĩ
            // 2. Lịch phải đang Available (trống)
            // 3. Thời gian bắt đầu (start_time) phải khớp với thời gian yêu cầu
            const slot = await this.prismaService.doctorSchedule.findFirst({
                where: {
                    doctor_id: doctorId,
                    is_available: true,
                    // So sánh chính xác thời gian bắt đầu
                    start_time: requestTime, 
                },
            });

            if (!slot) {
                this.serviceLogger.warn(`No available slot found for Doctor ${doctorId} at ${requestTime.toISOString()}`);
            } else {
                this.serviceLogger.log(`Found schedule ID: ${slot.schedule_id}`);
            }

            return slot;
        } catch (error) {
            this.serviceLogger.error(`Error finding slot: ${error.message}`);
            return null; // Trả về null để bên AppointmentService xử lý thông báo lỗi
        }
    }

    /**
     * Tìm các slot rảnh khác của bác sĩ trong cùng ngày
     */
     async findAlternativeSlots(doctorId: string, originalDate: Date): Promise<DoctorSchedule[]> {
        // Xác định đầu ngày và cuối ngày
        const startOfDay = new Date(originalDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(originalDate);
        endOfDay.setHours(23, 59, 59, 999);

        return this.prismaService.doctorSchedule.findMany({
            where: {
                doctor_id: doctorId,
                is_available: true,
                schedule_date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                // Chỉ lấy các slot chưa qua (nếu là ngày hôm nay)
                // start_time: { gt: new Date() } // Uncomment nếu muốn chặn giờ quá khứ chặt chẽ
            },
            orderBy: {
                start_time: 'asc'
            },
            take: 3 // Chỉ lấy 3 gợi ý gần nhất
        });
    }

    /**
     * Tìm các slot rảnh sắp tới của bác sĩ (tính từ giờ hiện tại)
     */
    async findUpcomingSlots(doctorId: string, limit: number = 5) {
        return this.prismaService.doctorSchedule.findMany({
            where: {
                doctor_id: doctorId,
                is_available: true,
                start_time: {
                    gte: new Date() 
                }
            },
            orderBy: {
                start_time: 'asc' 
            },
            take: limit
        });
    }

    /**
     * Tìm tất cả bác sĩ rảnh vào một khung giờ cụ thể
     */
    async findSchedulesByTime(date: Date) {
        return this.prismaService.doctorSchedule.findMany({
            where: {
                start_time: date,
                is_available: true
            },
            include: {
                Doctor: {
                    include: {
                        Specialty: true
                    }
                }
            }
        });
    }

    /**
     * Helper: Parse date string (YYYY-MM-DD) to Date object at start of day UTC
     */
    private parseDate(dateStr: string): Date {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    }

    private formatDateToYYYYMMDD(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private async convertToLocal(request: ScheduleRequest): Promise<ScheduleUTC> {
        const scheduleDate = new Date(`${request.schedule_date}T00:00:00`);
        const startTime = new Date(`${request.schedule_date}T${request.start_time}:00`);
        const endTime = new Date(`${request.schedule_date}T${request.end_time}:00`);

        if (isNaN(scheduleDate.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new BadRequestException(`Định dạng ngày hoặc giờ không hợp lệ. Vui lòng sử dụng YYYY-MM-DD và HH:mm.`);
        }

        return {
            schedule_date: scheduleDate,
            start_time: startTime,
            end_time: endTime,
        };
    }

    private async checkDateTime(id: string, request: CreateScheduleDTO): Promise<ScheduleUTC> {
        const formatted = await this.convertToLocal(request);
        const now = new Date();

        this.validateScheduleDate(formatted.schedule_date, now);
        this.validateScheduleTime(formatted.start_time, formatted.end_time, formatted.schedule_date, now);
        this.validateWorkingHours(request.start_time, request.end_time); // ✅ FIX: Pass the original time strings
        this.validateMinimumAdvanceBooking(formatted.start_time, now);
        this.validateDuration(request.start_time, request.end_time); // ✅ FIX: Pass the original time strings
        await this.validateNoConflict(id, formatted.schedule_date, formatted.start_time, formatted.end_time);

        return formatted;
    }

    private validateScheduleDate(scheduleDate: Date, now: Date): void {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (scheduleDate < today) {
            throw new BadRequestException('Không thể đặt lịch ở ngày trong quá khứ');
        }
    }

    private validateScheduleTime(startTime: Date, endTime: Date, scheduleDate: Date, now: Date): void {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const selectedDate = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());

        if (selectedDate.getTime() === today.getTime() && startTime < now) {
            throw new BadRequestException('Không thể đặt lịch ở giờ trong quá khứ');
        }

        if (endTime <= startTime) {
            throw new BadRequestException('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
        }
    }

    private validateWorkingHours(startTimeStr: string, endTimeStr: string): void {const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const MORNING_START = 8 * 60;
        const MORNING_END = 11 * 60 + 30;
        const AFTERNOON_START = 13 * 60;
        const AFTERNOON_END = 17 * 60 + 30;

        const inMorningShift = startMinutes >= MORNING_START && endMinutes <= MORNING_END;
        const inAfternoonShift = startMinutes >= AFTERNOON_START && endMinutes <= AFTERNOON_END;

        if (!inMorningShift && !inAfternoonShift) {
            throw new BadRequestException(
                'Giờ đặt lịch phải nằm trong khung giờ làm việc: sáng (08:00 - 11:30) hoặc chiều (13:00 - 17:30)'
            );
        }
    }

    private validateMinimumAdvanceBooking(startTime: Date, now: Date): void {
        const MIN_BEFORE_START_MINUTES = 15;
        const minBeforeStart = new Date(startTime.getTime() - MIN_BEFORE_START_MINUTES * 60 * 1000);

        if (now > minBeforeStart) {
            throw new BadRequestException(
                `Bạn phải đặt lịch trước ít nhất ${MIN_BEFORE_START_MINUTES} phút so với giờ bắt đầu`
            );
        }
    }

    private validateDuration(startTimeStr: string, endTimeStr: string): void {
        const REQUIRED_DURATION_MINUTES = 30;
        const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        if (endTotalMinutes - startTotalMinutes !== REQUIRED_DURATION_MINUTES) {
            throw new BadRequestException(
                'Khoảng thời gian giữa giờ bắt đầu và giờ kết thúc phải đúng 30 phút'
            );
        }
    }

    private async validateNoConflict(
        doctorId: string,
        scheduleDate: Date,
        startTime: Date,
        endTime: Date
    ): Promise<void> {
        const { startOfDay, endOfDay } = this.getDayBoundaries(scheduleDate);
        const existingSchedule = await this.prismaService.doctorSchedule.findFirst({
            where: {
                doctor_id: doctorId,
                schedule_date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                start_time: { lt: endTime },
                end_time: { gt: startTime },
            },
        });

        if (existingSchedule) {
            throw new BadRequestException(
                'Bác sĩ đã có lịch ở khung giờ này, vui lòng chọn giờ khác'
            );
        }
    }
    

    private getDayBoundaries(date: Date): { startOfDay: Date; endOfDay: Date } {
        if (isNaN(date.getTime())) {
            throw new BadRequestException('Ngày cung cấp không hợp lệ.');
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    }

    async createSchedule(payload: IAuthUser, request: CreateScheduleDTO): Promise<DoctorSchedule> {
        const doctorId = await this.getDoctorId(payload);
        const checkData = await this.checkDateTime(doctorId, request);

        const data: DoctorSchedule = await this.save({
            doctor_id: doctorId,
            ...checkData
        });

        const show = await this.show(data.schedule_id, RELATIONS.SCHEDULE);
        return show;
    }

    async createManySchedules(payload: IAuthUser, request: CreateScheduleDTO[]): Promise<DoctorSchedule[]> {
        const doctorId = await this.getDoctorId(payload);
        const results: DoctorSchedule[] = [];

        for (const schedule of request) {
            const checkData = await this.checkDateTime(doctorId, schedule);

            const created = await this.save({
                doctor_id: doctorId,
                ...checkData
            });

            const fullData = await this.show(created.schedule_id, RELATIONS.SCHEDULE);
            results.push(fullData);
        }

        return results;
    }


    async delete(id: string, userId: string): Promise<{ message: string }> {
        const schedule = await this.findById(id);

        if (!schedule) {
            throw new BadRequestException("Không tìm thấy lịch khám");
        }

        const doctorId = await this.doctorService.getDoctorIdByUserId(userId);

        if (doctorId !== schedule.doctor_id) {
            throw new BadRequestException("Chỉ có bác sĩ tạo lịch khám này mới có thể xóa");
        }

        // Kiểm tra xem lịch này đã có appointment chưa
        const hasAppointment = await this.checkHasActiveAppointment(schedule.schedule_id);
        
        if (hasAppointment) {
            throw new BadRequestException(
                "Không thể xóa lịch khám đã có cuộc hẹn. Vui lòng hủy cuộc hẹn trước."
            );
        }

        try {
            await this.save({is_deleted: true}, id);
        } catch (error) {
            console.error(error);
            throw new BadRequestException("Không thể xóa lịch khám");
        }

        return { message: 'Xóa lịch khám thành công' };
    }

    private async checkHasActiveAppointment(scheduleId: string): Promise<boolean> {
        const appointment = await this.prismaService.appointment.findFirst({
            where: {
                schedule_id: scheduleId,
                // Chỉ tìm những cuộc hẹn có trạng thái KHÁC cancelled
                status: {
                    not: AppointmentStatus.cancelled, 
                },
            },
        });

        return !!appointment; 
    }
}