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

    
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
    ): Promise<TApiReponse<ScheduleDTO>> {
        const data: DoctorSchedule = await this.scheduleService.show(id, RELATIONS.SCHEDULE);

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, ScheduleDTO),
            'Success',
            HttpStatus.CREATED
        )
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async showAll(
        @Query() query: Record<string, any>,
    ): Promise<TApiReponse<ScheduleDTO[]>>{
        const data: DoctorSchedule[] = await this.scheduleService.showAll(query, RELATIONS.SCHEDULE)
        return ApiResponse.suscess(
            this.transformer.transformArray(data, ScheduleDTO),
            'Success',
            HttpStatus.OK
        )
    }

}