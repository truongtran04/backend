import { BadRequestException, Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { IBaseRepository } from "src/repositories/base.repository";
import { Request } from 'express';
import { IPaginateResult } from "src/classes/query-builder.class";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { BaseTransaction } from "src/classes/base.transaction";

export type TResult<T> = T | T[] | null | string | number | IPaginateResult<T>

export interface BaseServiceInterface<T, ID = string | number>{
    save<Q>(payload: Q, id?: ID): Promise<T>,
    show(id: string): Promise<T>,
    paginate(request: Request, include?: Record<string, boolean>): Promise<T[] | IPaginateResult<T>>
    destroy(id: ID): Promise<T>
}

@Injectable()
export class BaseService<R extends IBaseRepository<TModel, ID>, TModel,  ID = string> extends BaseTransaction<TModel, ID> {
    protected readonly logger = new Logger(BaseService.name)
    protected readonly specificationBuilder: SpecificationBuilder = new SpecificationBuilder()

    constructor(
        protected readonly repository: R,
        protected readonly prismaService?: PrismaService,
        specificationBuilder?: SpecificationBuilder,
    ){
        super(repository)
        this.specificationBuilder = specificationBuilder ?? new SpecificationBuilder()
    }

    async paginate(query: Record<string, any>, include?: Record<string, boolean>): Promise<IPaginateResult<TModel>> {
        const specifications = this.specificationBuilder.buildSpecifications(query);
        this.result = await this.repository.pagination(specifications, include);
        return this.getResult<IPaginateResult<TModel>>();
    }


    async show(id: ID, include?: Record<string, boolean>): Promise<TModel>{
        this.result = await this.findById(id, include)
        return this.getResult<TModel>()
    }

    async findOneByField(field: string, value: string | number): Promise<TModel> {
        this.result = await this.findByField(field, value)
        return this.getResult<TModel>()
    }

    async findFirst(where: Partial<TModel>): Promise<TModel | null> {
        this.result = await this.repository.findFirst(where)
        return this.getResult<TModel>()
    }


    async save<P>(payload: P, id?: ID): Promise<TModel>{
        if(!this.prismaService){
            throw new BadRequestException("Không thể mở transaction cho tiến trình này")
        }
        return await this.prismaService.$transaction(async() => {
             return await this.prepareModelData<P>(payload)
                .then(() => this.beforeSave(id, payload))
                .then(() => this.saveModel(id))
                .then(() => this.afterSave())
                .then(() => this.handleRelation())
                .then(() => this.getResult<TModel>())
        })
    }

    async destroy(id: ID): Promise<TModel>{
        if(!this.prismaService){
            throw new BadRequestException("Không thể mở transaction cho tiến trình này")
        }
        return await this.prismaService.$transaction(async() => {
             return await this.beforeDelete(id)
                .then(() => this.deleteModel(id))
                .then(() => this.afterDelete())
                .then(() => this.getResult<TModel>())
        })
    }

    protected async getResult<T = TResult<TModel>>(): Promise<T>{
        return Promise.resolve(this.result as T)
    }
}