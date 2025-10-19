import { Body, Controller, Patch, HttpStatus, Logger, Post, Get, Param, Req, HttpCode, UseGuards, UnauthorizedException, Res, Put, Query } from '@nestjs/common';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import type { Request, Response } from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Appointment } from '@prisma/client';
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { AppointmentService } from './appointment.service';
import { AppointmentDTO } from './dto/appointment.dto';
import { CreateAppointmentDTO } from './dto/create-appointment.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { AppointmentStatus } from './appointment.interface';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';
import { RELATIONS } from 'src/common/constants/relations.constant';

const GUARD = common.admin


@Controller('v1/appointments')
export class AppointmentController extends BaseController<Appointment, 'appointment_id', AppointmentService> {
    private readonly controllerLogger = new Logger(BaseController.name)
    
    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly transformer: DataTransformer<Appointment, AppointmentDTO>
    ) {
        super(appointmentService, 'appointment_id');
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('patient', 'admin')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body(new ValidationPipe()) createRequest: CreateAppointmentDTO,
        @Req() req,
    ) : Promise<TApiReponse<AppointmentDTO>> {
        const data: Appointment = await this.appointmentService.createAppointment(req.user, createRequest)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, AppointmentDTO),
            'Success', 
            HttpStatus.CREATED
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor', 'patient', 'admin')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
        @Req() req,
    ) : Promise<TApiReponse<AppointmentDTO>> {

        const roleGroup = req.user.role;
        const data: Appointment = await this.appointmentService.show(id, RELATIONS.APPOINTMENT)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, AppointmentDTO, [roleGroup]),
            'Success', 
            HttpStatus.CREATED
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor', 'patient', 'admin')
    @Post('/confirm/:id')
    @HttpCode(HttpStatus.OK)
    async confirm(
        @Param('id') id: string,
        @Req() req
    ) : Promise<TApiReponse<string>> {
        const res = await this.appointmentService.updateAppointmentStatus(
            id,
            req.user,
            {
                status: AppointmentStatus.CONFIRM,
                message:  "Bác sĩ đã xác nhận cuộc hẹn"
            })
        return ApiResponse.message(
            res.message,
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor', 'patient', 'admin')
    @Post('/complete/:id')
    @HttpCode(HttpStatus.OK)
    async complete(
        @Param('id') id: string,
        @Req() req
    ) : Promise<TApiReponse<string>> {
        const res = await this.appointmentService.updateAppointmentStatus(
            id,
            req.user,
            {
                status: AppointmentStatus.COMPLETE,
                message:  "Cuộc hẹn thành công"
            })
        return ApiResponse.message(
            res.message,
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor', 'patient', 'admin')
    @Post('/cancel/:id')
    @HttpCode(HttpStatus.OK)
    async cancel(
        @Param('id') id: string,
        @Req() req
    ) : Promise<TApiReponse<string>> {
        const res = await this.appointmentService.updateAppointmentStatus(
            id,
            req.user,
            {
                status: AppointmentStatus.CANCEL,
                message:  "Cuộc hẹn đã được hủy"
            })
        return ApiResponse.message(
            res.message,
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Get('/doctor/:id')
    @HttpCode(HttpStatus.OK)
    async doctorAppointmentList(
        @Param('id') id: string,
        @Query() query: Record<string, any>,
        @Req() req
    ) : Promise<TApiReponse<TModelOrPaginate<AppointmentDTO>>> {

        const roleGroup = req.user.role;
        query.doctor_id = id;

        const data: Appointment[] | IPaginateResult<Appointment> = await this.appointmentService.paginate(query, RELATIONS.APPOINTMENT)
                
        const dataTransform: TModelOrPaginate<AppointmentDTO> = Array.isArray(data)
                    ? this.transformer.transformArray(data, AppointmentDTO, [roleGroup])
                    : this.transformer.transformPaginated(data, AppointmentDTO, [roleGroup])
        
        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'patient')
    @Get('/patient/:id')
    @HttpCode(HttpStatus.OK)
    async patientAppointmentList(
        @Param('id') id: string,
        @Query() query: Record<string, any>,
        @Req() req
    ) : Promise<TApiReponse<TModelOrPaginate<AppointmentDTO>>> {

        const roleGroup = req.user.role;
        query.patient_id = id;

        const data: Appointment[] | IPaginateResult<Appointment> = await this.appointmentService.paginate(query, RELATIONS.APPOINTMENT)
                
        const dataTransform: TModelOrPaginate<AppointmentDTO> = Array.isArray(data)
                    ? this.transformer.transformArray(data, AppointmentDTO, [roleGroup])
                    : this.transformer.transformPaginated(data, AppointmentDTO, [roleGroup])
        
        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'patient', 'doctor')
    @Get('/schedule/:id')
    @HttpCode(HttpStatus.OK)
    async showAppointmentBySchedule(
        @Param('id') id: string,
        @Req() req
    ) : Promise<TApiReponse<AppointmentDTO>> {

        const roleGroup = req.user.role;
        const data: Appointment = await this.appointmentService.getAppointmentBySchedule(id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, AppointmentDTO, [roleGroup]),
            'Success', 
            HttpStatus.CREATED
        )
    }
}
