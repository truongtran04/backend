import { Body, Controller, HttpStatus, Post, Req, HttpCode, Get, UseGuards, Res, Param, Put, Delete, Patch, Query } from '@nestjs/common';
import { ValidationPipe } from 'src/pipes/validation.pipe';

import { ApiResponse, TApiReponse } from 'src/common/bases/api-reponse';
import express from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Logger } from "@nestjs/common";
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DoctorSchedule, Specialty } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { ScheduleDTO } from './dto/schedule.dto';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { RELATIONS } from 'src/common/constants/relations.constant';

const GUARD = common.admin


@Controller('v1/schedules')
export class ScheduleController extends BaseController<DoctorSchedule, 'schedule_id', ScheduleService> {
    private readonly controllerLogger = new Logger(BaseController.name)

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
    ) : Promise<TApiReponse<ScheduleDTO>> {
        const data: DoctorSchedule = await this.scheduleService.createSchedule(req.user, createRequest)
        
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, ScheduleDTO),
            'Success', 
            HttpStatus.CREATED
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string
    ) : Promise<TApiReponse<ScheduleDTO>> {
        const data: DoctorSchedule = await this.scheduleService.show(id, RELATIONS.SCHEDULE)
        
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, ScheduleDTO),
            'Success', 
            HttpStatus.CREATED
        )
    }
}
