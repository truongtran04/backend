/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException, UnauthorizedException, Inject, Logger, NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { BaseService } from 'src/common/bases/base.service';
import { PrismaService } from "../../prisma/prisma.service";
import { ValidateService } from 'src/modules/validate/validate.service';
import { TCastField } from 'src/classes/specification-builder.class';
import { SpecialtyRepository } from './specialty.repository';
import { Specialty } from '@prisma/client';
import { CreateSpecialtyDTO } from './dto/create-specialty.dto';
import { UpdateSpecialtyDTO } from './dto/update-specialty.dto';
import { SpecificationBuilder } from "src/classes/specification-builder.class";

@Injectable()
export class SpecialtyService extends BaseService<SpecialtyRepository, Specialty> {
    
    private readonly serviceLogger = new Logger(SpecialtyService.name)

    constructor(
        private readonly specialtyRepository: SpecialtyRepository,
        protected readonly prismaService: PrismaService,
        private readonly validateService: ValidateService
    ){
        super(
            specialtyRepository, 
            prismaService,
            new SpecificationBuilder({
                defaultSort: 'created_at, desc',
                searchFields: ['name'],
                simpleFilter: ['specialty_id'],
                dateFilter: ['created_at', 'updated_at'],
                fieldTypes: { specialty_id: 'string' }
            })
        )
    }

    protected async beforeSave(id?: string, payload?: CreateSpecialtyDTO | UpdateSpecialtyDTO): Promise<this>{
        if(!payload){
            throw new BadRequestException('Dữ liệu không hợp lệ')
        }
        await this.validateService.model('specialty')
                .context({ primaryKey: 'specialty_id', id })
                .unique('name', payload.name, "Chuyên ngành đã tồn tại")
                .validate()

        return Promise.resolve(this)
    }
    
    async getSpecialtyId(title: string): Promise<string> {
        
        const specialtyData = await this.findOneByField('name', title)
        return specialtyData.specialty_id
    }

}
