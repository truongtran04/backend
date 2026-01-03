import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseService } from 'src/common/bases/base.service';
import { PrismaService } from "../../prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { DoctorSchedule } from '@prisma/client';
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
}