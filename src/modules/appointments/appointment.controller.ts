import { Body, Controller, Patch, HttpStatus, Logger, Post, Get, Param, Req, HttpCode, UseGuards, UnauthorizedException, Res, Put, Query, ForbiddenException } from '@nestjs/common';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import type { Request, Response } from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Appointment, Doctor } from '@prisma/client';
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
import { PatientService } from '../patients/patient.service';
import { DoctorService } from '../doctors/doctor.service';

const GUARD = common.admin


@Controller('v1/appointments')
export class AppointmentController extends BaseController<Appointment, 'appointment_id', AppointmentService> {
    private readonly controllerLogger = new Logger(BaseController.name)
    
    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly patientService: PatientService,
        private readonly doctorService: DoctorService,
        private readonly transformer: DataTransformer<Appointment, AppointmentDTO>
    ) {
        super(appointmentService, 'appointment_id');
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('patient')
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
    @Roles('doctor')
    @Get('/doctor')
    @HttpCode(HttpStatus.OK)
    async doctorAppointmentList(
        @Req() req,
        @Query() query: Record<string, any>,
    ) : Promise<TApiReponse<AppointmentDTO[]>> {

        const doctorId = await this.doctorService.getDoctorIdByUserId(req.user.userId);

        const data: Appointment[] = await this.appointmentService.showAll({
            ...query,
            doctor_id: doctorId
        }, RELATIONS.APPOINTMENT)
        
        return ApiResponse.suscess(
            this.transformer.transformArray(data, AppointmentDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('patient')
    @Get('/patient')
    @HttpCode(HttpStatus.OK)
    async patientAppointmentList(
        @Query() query: Record<string, any>,
        @Req() req
    ) : Promise<TApiReponse<TModelOrPaginate<AppointmentDTO>>> {
        
        const patientId = await this.patientService.findByUserId(req.user.userId);

        const data: Appointment[] = await this.appointmentService.showAll({
            ...query,
            patient_id: patientId
        }, RELATIONS.APPOINTMENT)
                
        return ApiResponse.suscess(
            this.transformer.transformArray(data, AppointmentDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor', 'patient')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
    ) : Promise<TApiReponse<AppointmentDTO>> {

        const data: Appointment = await this.appointmentService.show(id, RELATIONS.APPOINTMENT)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, AppointmentDTO),
            'Success', 
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('doctor')
    @Post('/confirm/:id')
    @HttpCode(HttpStatus.OK)
    async confirm(
        @Param('id') id: string,
        @Req() req
    ) : Promise<TApiReponse<string>> {
        console.log(id);
        console.log(req.user);
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
    @Roles('doctor')
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
    @Roles('doctor', 'patient')
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
    @Roles('admin', 'patient', 'doctor')
    @Get('/schedule/:id')
    @HttpCode(HttpStatus.OK)
    async showAppointmentBySchedule(
        @Param('id') id: string,
    ) : Promise<TApiReponse<AppointmentDTO>> {

        const data: Appointment = await this.appointmentService.getAppointmentBySchedule(id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, AppointmentDTO),
            'Success', 
            HttpStatus.OK
        )
    }
}
