/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, HttpStatus, Post, Req, HttpCode, Get, UseGuards, Res, Param, Put, Delete, Patch, Query } from '@nestjs/common';
import { ValidationPipe } from 'src/pipes/validation.pipe';

import { ApiResponse, TApiReponse } from 'src/common/bases/api-reponse';
import express from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Logger } from "@nestjs/common";
import { BaseController } from 'src/common/bases/base.controller';
import { TResult } from 'src/common/bases/base.service';
import { DataTransformer } from 'src/common/bases/data.transform';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Specialty } from '@prisma/client';
import { SpecialtyService } from './specialty.service';
import { SpecialtyDTO } from './dto/specialty.dto';
import { CreateSpecialtyDTO } from './dto/create-specialty.dto';
import { UpdatePatchSpecialtyDTO, UpdateSpecialtyDTO } from './dto/update-specialty.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';

const GUARD = common.admin


@Controller('v1/specialties')
export class SpecialtyController extends BaseController<Specialty, 'specialty_id', SpecialtyService> {
    private readonly controllerLogger = new Logger(BaseController.name)

    constructor(
        private readonly specialtyService: SpecialtyService,
        private readonly transformer: DataTransformer<Specialty, SpecialtyDTO>
    ) {
        super(specialtyService, 'specialty_id');
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
         @Body(new ValidationPipe()) createRequest: CreateSpecialtyDTO,
    ) : Promise<TApiReponse<SpecialtyDTO>> {
        const data: Specialty = await this.specialtyService.create(createRequest)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, SpecialtyDTO),
            'Success', 
            HttpStatus.CREATED
        )      
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Put(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Body(new ValidationPipe()) updateRequest: UpdateSpecialtyDTO,
        @Param('id') id: string,
        @Req() req: Request
    ): Promise<TApiReponse<SpecialtyDTO>>{
        const data: Specialty = await this.specialtyService.update(updateRequest, id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, SpecialtyDTO),
            'Success', 
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async updatePatch(
        @Body(new ValidationPipe()) updateRequest: UpdatePatchSpecialtyDTO,
        @Param('id') id: string,
        @Req() req: express.Request
    ): Promise<TApiReponse<SpecialtyDTO>>{
        const data: TResult<Specialty> = await this.specialtyService.update(updateRequest, id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, SpecialtyDTO), 
            'Success', 
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async destroy(
        @Param('id') id: string
    ): Promise<ApiResponse>{
        const res = await this.specialtyService.delete(id)
        return ApiResponse.message(res.message, HttpStatus.OK)

    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string
    ): Promise<TApiReponse<SpecialtyDTO>>{
        const data: Specialty = await this.specialtyService.show(id)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, SpecialtyDTO), 
            'Success', 
            HttpStatus.OK
        )
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async paginate(
        @Query() query: Record<string, any>
    ): Promise<TApiReponse<TModelOrPaginate<SpecialtyDTO>>>{
        const data: Specialty[] | IPaginateResult<Specialty> = await this.specialtyService.paginate(query)
        
        const dataTransform: TModelOrPaginate<SpecialtyDTO> = Array.isArray(data)
            ? this.transformer.transformArray(data, SpecialtyDTO)
            : this.transformer.transformPaginated(data, SpecialtyDTO)

        return ApiResponse.suscess(
            dataTransform, 
            'Success',
            HttpStatus.OK
        )
    }
}
