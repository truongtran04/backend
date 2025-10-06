// import { Injectable } from "@nestjs/common";
import { TResult } from "src/common/bases/base.service";
import { IBaseRepository } from "src/repositories/base.repository";
import { NotFoundException } from "@nestjs/common";

// @Injectable()
export abstract class BaseTransaction<TModel, ID> {

    protected abstract logger;
    protected repository: IBaseRepository<TModel, ID>

    protected modelData: Partial<TModel>
    protected model: TModel | null
    protected result: TResult<TModel>

    constructor(
        repository: IBaseRepository<TModel, ID>
    ){
        this.repository = repository
    }

    async findById(id: ID, include?: Record<string, boolean>): Promise<TModel | null>{
        const model = await this.repository.findById(id, include)
        return model
    }

    async findByField(field: string, value: string | number): Promise<TModel | null>{
        const model = await this.repository.findByField(field, value)
        return model
    }

    async findFirst(where: Partial<TModel>): Promise<TModel | null> {
        const model = await this.repository.findFirst(where)
        return model
    }
    
    protected async prepareModelData<P>(payload: P): Promise<this>{
        this.modelData = {...payload} as Partial<TModel>
        return Promise.resolve(this)
    }

    protected async beforeSave(id?: ID, payload?: unknown): Promise<this>{
        console.log('id', id);
        console.log('payload', payload);
        return Promise.resolve(this)
    }

    protected async afterSave(): Promise<this>{
        return Promise.resolve(this)
    }

    protected async handleRelation(): Promise<this> {
        return Promise.resolve(this)
    }

    protected async saveModel(id?: ID): Promise<this> {
        if(id){
            this.model = await this.repository.update(id, this.modelData)
        }else{
            this.model = await this.repository.create(this.modelData)
        }
        this.result = this.model
        return this
    }

  
    protected async beforeDelete(id: ID): Promise<this>{
        return this.checkModelExist(id)
    }

    protected async checkModelExist(id: ID): Promise<this>{
        this.model = await this.findById(id)
        if(!this.model){
            throw new NotFoundException("Không tìm thấy tài nguyên hợp lệ")
        }
        return Promise.resolve(this)
    }

    protected async deleteModel(id: ID): Promise<this>{
        this.result = await this.repository.delete(id)
        return Promise.resolve(this)
    }

    protected async afterDelete(): Promise<this>{
        return Promise.resolve(this)
    }

}