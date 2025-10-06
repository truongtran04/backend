import { Expose, Exclude, Transform, TransformFnParams } from "class-transformer";
import { ToLocalISOString } from "src/utils/date-transformer";

export class UserDTO {
    
    @Expose({name: 'user_id'})
    id: string;

    @Expose()
    email: string;

    @Exclude()
    password_hash: string;

    @Expose()
    role: string;

    @Expose({name: 'is_active'})
    active: boolean;

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createAt: Date

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: Date
}