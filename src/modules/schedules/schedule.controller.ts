import { Body, Controller, HttpStatus, Post, Req, HttpCode, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ValidationPipe } from 'src/pipes/validation.pipe';
import { ApiResponse, TApiReponse } from 'src/common/bases/api-reponse';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Logger } from "@nestjs/common";
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DoctorSchedule } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { ScheduleDTO } from './dto/schedule.dto';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { RELATIONS } from 'src/common/constants/relations.constant';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';

const GUARD = common.admin;

@Controller('v1/schedules')
export class ScheduleController extends BaseController<DoctorSchedule, 'schedule_id', ScheduleService> {
    private readonly controllerLogger = new Logger(ScheduleController.name);

    constructor(
        private readonly scheduleService: ScheduleService,
        private readonly transformer: DataTransformer<DoctorSchedule, ScheduleDTO>
    ) {
        super(scheduleService, 'schedule_id');
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body(new ValidationPipe()) createRequest: CreateScheduleDTO,
        @Req() req,
    ): Promise<TApiReponse<ScheduleDTO>> {
        const role = req.user.role;
        const data: DoctorSchedule = await this.scheduleService.createSchedule(req.user, createRequest);

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, ScheduleDTO, [role]),
            'Success',
            HttpStatus.CREATED
        );
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor')
    @Post('/many-schedules')
    @HttpCode(HttpStatus.CREATED)
    async createManySchedules(
        @Body(new ValidationPipe()) createRequest: CreateScheduleDTO[],
        @Req() req,
    ): Promise<TApiReponse<TModelOrPaginate<ScheduleDTO>>> {
        const role = req.user.role;
        const data: DoctorSchedule[] = await this.scheduleService.createManySchedules(req.user, createRequest);
        const dataTransform: TModelOrPaginate<ScheduleDTO> = this.transformer.transformArray(data, ScheduleDTO, [role]);

        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        );
    }


    /**
     * ⚠️ IMPORTANT: Place specific routes BEFORE dynamic routes (:id)
     * 🆕 NEW: Lấy các ngày có lịch khám của bác sĩ (để hiển thị calendar)
     * Endpoint: GET /v1/schedules/doctor/:doctorId/available-dates
     */
    @Get('doctor/:doctorId/available-dates')
    @HttpCode(HttpStatus.OK)
    async getAvailableDates(
        @Param('doctorId') doctorId: string,
        @Query() query: Record<string, any>,
    ): Promise<TApiReponse<string[]>> {
        try {
            this.controllerLogger.log(`Getting available dates for doctor ${doctorId}`);
            
            const dates = await this.scheduleService.getAvailableDates(
                doctorId,
                query.from_date,
                query.to_date,
                query.is_available !== 'false' // default true
            );

            return ApiResponse.suscess(
                dates,
                'Success',
                HttpStatus.OK
            );
        } catch (error) {
            this.controllerLogger.error(`Error getting available dates: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 🆕 NEW: Lấy tất cả lịch khám (public hoặc theo doctor)
     * Endpoint: GET /v1/schedules
     * ⚠️ MUST be placed BEFORE @Get(':id')
     */
    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    async getSchedules(
        @Query() query: Record<string, any>,
        @Req() req,
    ): Promise<TApiReponse<TModelOrPaginate<ScheduleDTO>>> {
        try {
            // Allow public access, but check for role if user is authenticated
            const role = req.user?.role || 'patient';
            if (req.user?.role === 'doctor' && !query.doctor_id) {
                const doctorId = await this.scheduleService.getDoctorId(req.user);
                if (doctorId) {
                    query.doctor_id = doctorId;
                    this.controllerLogger.log(`Forcing filter by logged-in doctor_id: ${doctorId}`);
                }
            }
            
            // Validate và transform schedule_date nếu có
            if (query.schedule_date) {
                query.schedule_date = this.normalizeScheduleDate(query.schedule_date);
            }
            
            const data: DoctorSchedule[] | IPaginateResult<DoctorSchedule> = 
                await this.scheduleService.paginate(query, RELATIONS.SCHEDULE);
            
            const dataTransform: TModelOrPaginate<ScheduleDTO> = Array.isArray(data)
                ? this.transformer.transformArray(data, ScheduleDTO, [role])
                : this.transformer.transformPaginated(data, ScheduleDTO, [role]);

            return ApiResponse.suscess(
                dataTransform, 
                'Success',
                HttpStatus.OK
            );
        } catch (error) {
            this.controllerLogger.error(`Error getting schedules: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * GET single schedule by ID
     * ⚠️ MUST be placed AFTER all specific routes
     * Endpoint: GET /v1/schedules/:id
     */
    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor', 'patient')
    @Get(':id')

    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
        @Req() req,
    ): Promise<TApiReponse<ScheduleDTO>> {
        const role = req.user.role;
        const data: DoctorSchedule = await this.scheduleService.show(id, RELATIONS.SCHEDULE);

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, ScheduleDTO, [role]),
            'Success',
            HttpStatus.CREATED
        )
    }

    @Get('/doctor')
    @HttpCode(HttpStatus.OK)
    async getListSchedulesByDoctor(
        @Query() query: Record<string, any>,
    ): Promise<TApiReponse<TModelOrPaginate<ScheduleDTO>>>{
        const data: DoctorSchedule[] | IPaginateResult<DoctorSchedule> = await this.scheduleService.paginate(query, RELATIONS.SCHEDULE)
        
        const dataTransform: TModelOrPaginate<ScheduleDTO> = Array.isArray(data)
            ? this.transformer.transformArray(data, ScheduleDTO)
            : this.transformer.transformPaginated(data, ScheduleDTO)

        return ApiResponse.suscess(
            dataTransform, 
            'Success',

            HttpStatus.OK
        );
    }

    /**
     * Helper: Normalize schedule_date to UTC Date for querying
     * Input: YYYY-MM-DD
     * Output: Date object at start of day UTC
     */
    private normalizeScheduleDate(dateStr: string): Date {
        if (!dateStr || typeof dateStr !== 'string') {
            throw new Error('Invalid date format: date string is empty or not a string.');
        }

        try {
            let year, month, day;
            const parts = dateStr.split('-').map(Number);

            // Thử phân tích YYYY-MM-DD trước
            if (parts.length === 3 && parts[0] > 1000) {
                [year, month, day] = parts;
            } 
            // Nếu không được, thử phân tích DD-MM-YYYY
            else if (parts.length === 3 && parts[2] > 1000) {
                [day, month, year] = parts;
            }
            
            return new Date(Date.UTC(year, month - 1, day));
        } catch (error) {
            this.controllerLogger.error(`Error normalizing date ${dateStr}: ${error.message}`);
            throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
        }
    }
}