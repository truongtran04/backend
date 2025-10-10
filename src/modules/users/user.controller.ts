/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, HttpStatus, Post, Req, HttpCode, Get, UseGuards, Res, Param, Put, Delete, Patch, Query } from '@nestjs/common';
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
import { User } from '@prisma/client';
import { UserService } from './user.service';
import { UserDTO } from './dto/user.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { TModelOrPaginate } from 'src/common/bases/base.interface';
import { IPaginateResult } from 'src/classes/query-builder.class';
import { RELATIONS } from 'src/common/constants/relations.constant';


const GUARD = common.admin


@Controller('v1/users')
export class UserController extends BaseController<User, 'user_id', UserService> {
    private readonly controllerLogger = new Logger(BaseController.name)

    constructor(
        private readonly userService: UserService,
        private readonly transformer: DataTransformer<User, UserDTO>
    ) {
        super(userService, 'user_id');
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body(new ValidationPipe()) createResquest: CreateUserDTO,
    ): Promise<TApiReponse<UserDTO>> {

        const data = await this.userService.createUserWithPatient(createResquest)

        return ApiResponse.suscess(
            this.transformer.transformSingle(data, UserDTO),
            'Success',
            HttpStatus.CREATED
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin', 'patient')
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async show(
        @Param('id') id: string,
        @Req() req,
    ): Promise<TApiReponse<UserDTO>> {

        const roleGroup = req.user.role
        const data: User = await this.userService.show(id, RELATIONS.USER)
        return ApiResponse.suscess(
            this.transformer.transformSingle(data, UserDTO, [roleGroup]),
            'Success',
            HttpStatus.OK
        )
    }

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Roles('admin')
    @Get()
    @HttpCode(HttpStatus.OK)
    async paginate(
        @Query() query: Record<string, any>
    ): Promise<TApiReponse<TModelOrPaginate<UserDTO>>> {
        const data: User[] | IPaginateResult<User> = await this.userService.paginate(query)

        const dataTransform: TModelOrPaginate<UserDTO> = Array.isArray(data)
            ? this.transformer.transformArray(data, UserDTO)
            : this.transformer.transformPaginated(data, UserDTO)

        return ApiResponse.suscess(
            dataTransform,
            'Success',
            HttpStatus.OK
        )
    }

}
