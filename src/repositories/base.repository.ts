import { Injectable } from "@nestjs/common";
import { ISpecifications } from "src/classes/specification-builder.class";
import { IPaginateResult } from "src/classes/query-builder.class";
import { PrismaModel } from "src/classes/query-builder.class";
import { QueryBuilder } from "src/classes/query-builder.class";

export interface IBaseRepository <TModel, ID = string> {
    setTransactionClient(tx: unknown): void,
    findById(id: ID, include?: Record<string, boolean>): Promise<TModel | null>,
    findByField(field: string, value: string | number, include?: any): Promise<TModel | null>,
    findFirst(where: Partial<TModel>, include?: any): Promise<TModel | null>,
    update<P extends Partial<TModel>>(id: ID, payload: P): Promise<TModel>,
    create<P extends Partial<TModel>>(payload: P): Promise<TModel>,
    delete(id: ID) : Promise<TModel>,
    pagination(specifications: ISpecifications, include?: Record<string, boolean>): Promise<TModel[] | IPaginateResult<TModel>>,
    query(): QueryBuilder<TModel>
}

@Injectable()
export class BaseRepository <T extends PrismaModel<TModel>, TModel, ID = string> implements IBaseRepository<TModel, ID>{

    private transactionClient: unknown = null

    constructor(
        protected readonly model: T,
        private readonly primaryKey: keyof TModel
    ){
       
    }

    query(): QueryBuilder<TModel>{
        return new QueryBuilder<TModel>(this.model, this.transactionClient)
    }

    setTransactionClient(tx: unknown){
        this.transactionClient = tx
    }
    
    async pagination(specifications: ISpecifications, include?: Record<string, boolean>): Promise<TModel[] | IPaginateResult<TModel>> {
        const { type, keyword, sort, perpage, filter, page } = specifications

        let builder = this.query().keyword(keyword).filter(filter.simple).sort(sort)

        if (include && Object.keys(include).length > 0) {
            builder = builder.with(include);
        }
        const result = await builder.execute(type, page, perpage);
        return result
    }

    async findById(id: ID, include?: object): Promise<TModel | null> {
        return await this.model.findUnique({
            where: {
                [this.primaryKey]: id, 
            },
            include: {
                ...include
            }
        })
    }

    async findByField(field: string, value: string | number): Promise<TModel | null> {
        return await this.model.findFirst({
            where: {
                [field]: value
            }
        })
    }

    async findFirst(where: Partial<TModel>, include?: any): Promise<TModel | null> {
        const query: any = { where };
        if (include) {
            query.include = include;
        }
        return await this.model.findFirst(query);
    }


    async update<P extends Partial<TModel>>(id: ID, payload: P): Promise<TModel> {
        return await this.model.update({
            where: { 
                [this.primaryKey]: id, 
            },
            data: payload
        })
    }

    async create<P extends Partial<TModel>>(payload: P): Promise<TModel> {
        return await this.model.create({
            data: payload
        })
    }

    async delete(id: ID): Promise<TModel>{
        return await this.model.delete({
            where: {
                [this.primaryKey]: id,
            }
        })
    }

}
