import { Expose, Transform, TransformFnParams } from "class-transformer";
import { ToLocalISOString } from "src/utils/date-transformer";
export class SpecialtyDTO {

    @Expose({ name: 'specialty_id' })
    id: string

    @Expose()
    specialty: string

    @Expose()
    name: string

    @Expose()
    description: string

    @Expose({ name: 'image_url' })
    image: string

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createAt: Date

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: Date
}