import { Body, Controller, Patch, HttpStatus, Logger, Post, Get, Param, Req, HttpCode, UseGuards, UnauthorizedException, Res, Put, Query, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import type { Request, Response } from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PatientService } from './patient.service';
import { PatientDTO } from './dto/patient.dto';
import { Patient } from '@prisma/client';
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { TResult } from 'src/common/bases/base.service';
import { UpdatePatchPatientDTO } from './dto/update-patient.dto';
import express from 'express';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { RELATIONS } from 'src/common/constants/relations.constant';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';

const GUARD = common.admin

@Controller('v1/patients')
export class PatientController extends BaseController<Patient, 'patient_id', PatientService> {
    private readonly controllerLogger = new Logger(BaseController.name)

    constructor(
        private readonly patientService: PatientService,
        private readonly transformer: DataTransformer<Patient, PatientDTO>
    ) {
        super(patientService, 'patient_id');
    }

    // ROUTE TĨNH PHẢI ĐƯỢC ĐẶT TRƯỚC ROUTE ĐỘNG
    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('patient') // Chỉ bệnh nhân mới có quyền truy cập hồ sơ của chính họ
    @Get('me')
    @HttpCode(HttpStatus.OK)
    async me(
        @Req() req,
    ): Promise<TApiReponse<PatientDTO>> {
        const userId = req.user.userId; // Lấy user id từ JWT payload
        const patient = await this.patientService.findFirst(
            { user_id: userId } as any,
            'User' // Tải kèm các mối quan hệ cần thiết (bao gồm User)
        );

        if (!patient) {
            // Ném ra lỗi 404 chuẩn nếu không tìm thấy
            throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân.');
        }

        return ApiResponse.suscess(
            this.transformer.transformSingle(patient, PatientDTO, ['patient']),
            'Success',
            HttpStatus.OK
        );
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'patient', 'doctor')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string
    ): Promise<TApiReponse<PatientDTO>> {
        const data: Patient = await this.patientService.show(id, RELATIONS.PATIENT)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, PatientDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'patient')
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async updatePatch(
        @Body(new ValidationPipe()) updateRequest: UpdatePatchPatientDTO,
        @Param('id') id: string,
        @Req() req: express.Request
    ): Promise<TApiReponse<PatientDTO>> {
        // Security Check: Nếu người dùng là 'patient', đảm bảo họ chỉ cập nhật hồ sơ của chính mình.
        if (req.user && req.user.role === 'patient') {
            const patientProfile = await this.patientService.findFirst({ user_id: req.user.userId });
            if (!patientProfile || patientProfile.patient_id !== id) {
                throw new ForbiddenException('Bạn không có quyền cập nhật hồ sơ này.');
            }
        }

        const data: TResult<Patient> = await this.patientService.save(updateRequest, id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, PatientDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Get()
    @HttpCode(HttpStatus.OK)
    async paginate(
        @Query() query: Record<string, any>
    ): Promise<TApiReponse<TModelOrPaginate<PatientDTO>>> {
        const data: Patient[] | IPaginateResult<Patient> = await this.patientService.paginate(query, RELATIONS.PATIENT)

        const dataTransform: TModelOrPaginate<PatientDTO> = Array.isArray(data)
            ? this.transformer.transformArray(data, PatientDTO)
            : this.transformer.transformPaginated(data, PatientDTO)

        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        )
    }
}
