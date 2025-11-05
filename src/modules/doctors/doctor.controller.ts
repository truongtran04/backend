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
import { Doctor } from '@prisma/client';
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { TResult } from 'src/common/bases/base.service';
import { DoctorService } from './doctor.service';
import { DoctorDTO } from './dto/doctor.dto';
import { CreateDoctorDTO, CreateDoctorWithoutEmailDTO } from './dto/create-doctor.dto';
import { UpdateDoctorDTO, UpdatePatchDoctorDTO } from './dto/update-doctor.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { RELATIONS } from 'src/common/constants/relations.constant';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';
import { QueueService } from '../queue/queue.service';

const GUARD = common.admin

@Controller('v1/doctors')
export class DoctorController extends BaseController<Doctor, 'doctor_id', DoctorService> {
    private readonly controllerLogger = new Logger(BaseController.name)
    
    constructor(
        private readonly doctorService: DoctorService,
        private readonly queueService: QueueService,
        private readonly transformer: DataTransformer<Doctor, DoctorDTO>
    ) {
        super(doctorService, 'doctor_id');
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body(new ValidationPipe()) createRequest: CreateDoctorDTO,
    ) : Promise<TApiReponse<DoctorDTO>> {

        const data: Doctor = await this.doctorService.createBasicDocTor(createRequest)

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, DoctorDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @Post('/many-doctors')
    @HttpCode(HttpStatus.ACCEPTED)
    async createManyDoctors(
        @Body(new ValidationPipe()) createRequest: CreateDoctorWithoutEmailDTO[],
    ) : Promise<TApiReponse<string>> {

        await this.queueService.addDoctors('create-many-doctors', { request: createRequest });
        return ApiResponse.message('Success', HttpStatus.ACCEPTED)
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Post('/active/:id')
    @HttpCode(HttpStatus.OK)
    async active(
        @Param('id') id: string
    ): Promise<ApiResponse>{
        const res = await this.doctorService.active(id)

        return ApiResponse.message(
            res.message,
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Put(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Body(new ValidationPipe()) updateRequest: UpdateDoctorDTO,
        @Param('id') id: string,
        @Req() req: Request
    ): Promise<TApiReponse<DoctorDTO>>{
        const data: Doctor = await this.doctorService.update(updateRequest, id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, DoctorDTO),
            'Success',
            HttpStatus.OK
        )
    }


    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'doctor')
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async updatePatch(
        @Body(new ValidationPipe()) updateRequest: UpdatePatchDoctorDTO,
        @Param('id') id: string,
        @Req() req: Request
    ): Promise<TApiReponse<DoctorDTO>>{

        const data: TResult<Doctor> = await this.doctorService.update(updateRequest, id)

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, DoctorDTO),
            'Success',
            HttpStatus.OK
        )
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
        @Req() req
    ): Promise<TApiReponse<DoctorDTO>>{
        const data: Doctor = await this.doctorService.show(id, RELATIONS.DOCTOR)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, DoctorDTO), 
            'Success', 
            HttpStatus.OK
        )
    }


    @Get()
    @HttpCode(HttpStatus.OK)
    async paginate(
        @Query() query: Record<string, any>,
        @Req() req
    ): Promise<TApiReponse<TModelOrPaginate<DoctorDTO>>> {
        const data: Doctor[] | IPaginateResult<Doctor> = await this.doctorService.paginate(query, RELATIONS.DOCTOR)
        
        const dataTransform: TModelOrPaginate<DoctorDTO> = Array.isArray(data)
                    ? this.transformer.transformArray(data, DoctorDTO)
                    : this.transformer.transformPaginated(data, DoctorDTO)

        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        )
    }
}
