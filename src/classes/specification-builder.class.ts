import { Injectable, Logger } from "@nestjs/common";

export type TKeyword = {
    q: string,
    fields: string[]
}
export type TFilterItem = Record<string, string | number | boolean | bigint | Record<string, unknown>>

export interface ISpecifications {
    type: boolean,
    perpage: number,
    page: number
    sort: string,
    keyword: TKeyword,
    filter: {
        simple: TFilterItem ,
        date: TFilterItem,
    }
}


export type TCastField = 'string' | 'number' | 'boolean' | 'bigint'

@Injectable()
export class SpecificationBuilder {
    private readonly logger = new Logger(SpecificationBuilder.name)

    /** ---  */
    protected perpage: number = 20
    protected sort: string
    protected searchFields: string[]
    protected simpleFilter: string[]
    protected dateFilter: string[]
    protected fieldTypes: Record<string, TCastField>

    constructor(
    options?: {
      defaultSort?: string,          
      searchFields?: string[],       
      simpleFilter?: string[],       
      dateFilter?: string[],         
      fieldTypes?: Record<string, TCastField>
    }
  ) {
    this.sort = options?.defaultSort ?? 'id, desc'
    this.searchFields = options?.searchFields ?? ['name']
    this.simpleFilter = options?.simpleFilter ?? ['id']
    this.dateFilter = options?.dateFilter ?? ['created_at', 'updated_at']
    this.fieldTypes = options?.fieldTypes ?? {}
  }


    buildFilter (query: Record<string, unknown>, filters: string[]): TFilterItem {
        const conditions: TFilterItem = {}
        filters.forEach(filter => {
            if(query[filter] && query[filter] !== undefined ){
                const value = query[filter] as string
                const fieldType = this.fieldTypes[filter]
                if(fieldType){
                    switch (fieldType) {
                        case 'number': {
                            const numValue = parseInt(value, 10)
                            conditions[filter] = numValue
                            break;
                        } 
                        case 'bigint': {
                            try {
                                conditions[filter] = BigInt(value)
                            } catch (error) {
                                console.log('Cast dữ liệu không thành công: ', error);
                                conditions[filter] = value
                            }
                            break
                        }
                        case 'boolean': {
                            conditions[filter] = value === 'true' || value === '1'
                            break;
                        }
                        default:
                            conditions[filter] = value
                            break;
                    }
                }else{
                    conditions[filter] = value
                }
            }
        })
        return conditions 
    }

    
    buildSpecifications(query: Record<string, any>): ISpecifications {
        return {
            type: query.type === 'all',
            perpage: query.perpage ? parseInt(query.perpage, 10) : this.perpage,
            page: query.page ? parseInt(query.page, 10) : 1,
            sort: query.sort ?? this.sort,
            keyword: {
            q: query.keyword ?? null,
            fields: this.searchFields,
            },
            filter: {
            simple: this.buildFilter(query, this.simpleFilter),
            date: this.buildFilter(query, this.dateFilter),
            },
        };
    }
}