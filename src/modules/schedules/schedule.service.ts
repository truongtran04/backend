/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseService } from 'src/common/bases/base.service';
import { PrismaService } from "../../prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { DoctorSchedule, Specialty } from '@prisma/client';
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

    private readonly serviceLogger = new Logger(ScheduleService.name)

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
                defaultSort: 'created_at, desc',
                searchFields: ['schedule_date', 'doctor_id'],
                simpleFilter: ['schedule_date', 'doctor_id'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: {
                    schedule_date: 'string',
                    doctor_id: 'string'
                }
            })
        )
    }

    protected async beforeSave(id?: string, payload?: CreateScheduleDTO | UpdateScheduleDTO): Promise<this> {
        if (!payload) {
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('doctorSchedule')
            .context({ primaryKey: 'schedule_id', id })
            .validate()

        return Promise.resolve(this)
    }

    async getDoctorId(payload: IAuthUser): Promise<string> {

        const user = await this.userService.findById(payload.userId)
        if (!user) {
            throw new BadRequestException('Không tìm thấy người dùng với id này');
        }

        const doctor = await this.doctorService.findByField('user_id', user.user_id)
        if (!doctor) {
            throw new BadRequestException('Không tìm thấy bác sĩ tương ứng với user này');
        }

        return doctor.doctor_id
    }

    private async convertToLocal(request: ScheduleRequest): Promise<ScheduleUTC> {
        const [day, month, year] = request.schedule_date.split('-').map(Number);

        const scheduleDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        const [startHour, startMinute] = request.start_time.split(':').map(Number);
        const [endHour, endMinute] = request.end_time.split(':').map(Number);

        const startTimeUTC = new Date(Date.UTC(year, month - 1, day, startHour - 7, startMinute, 0));
        const endTimeUTC = new Date(Date.UTC(year, month - 1, day, endHour - 7, endMinute, 0));

        return {
            schedule_date: scheduleDateUTC,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
        };
    }

    private async checkDateTime(id: string, request: CreateScheduleDTO): Promise<ScheduleUTC> {
        const formatted = await this.convertToLocal(request);
        const now = new Date();

        this.validateScheduleDate(formatted.schedule_date, now);
        this.validateScheduleTime(formatted.start_time, formatted.end_time, formatted.schedule_date, now);
        this.validateWorkingHours(formatted.start_time, formatted.end_time);
        this.validateMinimumAdvanceBooking(formatted.start_time, now);
        this.validateDuration(formatted.start_time, formatted.end_time);
        await this.validateNoConflict(id, formatted.schedule_date, formatted.start_time, formatted.end_time);

        return formatted;
    }

    private validateScheduleDate(scheduleDate: Date, now: Date): void {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const selectedDate = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());

        if (selectedDate < today) {
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

    private validateWorkingHours(startTime: Date, endTime: Date): void {
        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

        const MORNING_START = 8 * 60;       // 08:00
        const MORNING_END = 11 * 60 + 30;   // 11:30
        const AFTERNOON_START = 13 * 60;    // 13:00
        const AFTERNOON_END = 17 * 60 + 30; // 17:30

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

    private validateDuration(startTime: Date, endTime: Date): void {
        const REQUIRED_DURATION_MINUTES = 30;
        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        if (durationMinutes !== REQUIRED_DURATION_MINUTES) {
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

        const existingSchedule = await this.findFirst({
            doctor_id: doctorId,
            schedule_date: { gte: startOfDay, lte: endOfDay },
            AND: [
                { start_time: { lt: endTime } },
                { end_time: { gt: startTime } }
            ]
        } as any);

        if (existingSchedule) {
            throw new BadRequestException(
                'Bác sĩ đã có lịch ở khung giờ này, vui lòng chọn giờ khác'
            );
        }
    }

    private getDayBoundaries(date: Date): { startOfDay: Date; endOfDay: Date } {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    }


    async createSchedule(payload: IAuthUser, request: CreateScheduleDTO): Promise<DoctorSchedule> {

        const doctorId = await this.getDoctorId(payload)

        const checkData = await this.checkDateTime(doctorId, request)

        const data: DoctorSchedule = await this.save({
            doctor_id: doctorId,
            ...checkData
        })

        const show = await this.show(data.schedule_id, RELATIONS.SCHEDULE)

        return show
    }

    async createManySchedules(payload: IAuthUser, request: CreateScheduleDTO[]): Promise<DoctorSchedule[]> { 
        
        const doctorId = await this.getDoctorId(payload)
        const results: DoctorSchedule[] = []

        for (const schedule of request) { 

            const checkData = await this.checkDateTime(doctorId, schedule)
            
            const created = await this.save({
                doctor_id: doctorId, 
                ...checkData 
            })

            const fullData = await this.show(created.schedule_id, RELATIONS.SCHEDULE)

            results.push(fullData)
        } 
        return results
    }

}
