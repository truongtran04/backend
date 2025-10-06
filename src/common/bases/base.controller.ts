import { Body, Controller, HttpStatus, Post, Req, HttpCode, Get, UseGuards, UnauthorizedException, Res, Param } from '@nestjs/common';
import { ValidationPipe } from 'src/pipes/validation.pipe';

import { ApiResponse, TApiReponse } from 'src/common/bases/api-reponse';
import { Request, Response } from 'express';
import { common } from 'src/config/constant';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard'; 
import { Logger } from "@nestjs/common";
import { BaseServiceInterface } from './base.service';
import { TResult } from './base.service';
import { convertResponse } from 'src/utils/helper';


const GUARD = common.admin

export class BaseController<
  T,
  K extends keyof T,
  S extends BaseServiceInterface<T, K>
> {
  private readonly logger = new Logger(BaseController.name);

  constructor(
    protected readonly service: S,
    protected readonly primaryKey: K,   // truyền khóa chính vào
  ) {}

  findId(entity: T): T[K] {
    return entity[this.primaryKey];
  }
}
