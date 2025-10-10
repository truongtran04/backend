import { Expose, Exclude, Transform, TransformFnParams } from "class-transformer";
import { IsOptional } from "class-validator";
import { ToLocalISOString } from "src/utils/date-transformer";

export class UserDTO {
    
    @Expose({name: 'user_id'})
    id: string;

    @Expose()
    email: string;

    @Expose()
    @Transform(({ obj }) => {
        if (obj.Patient?.full_name) return obj.Patient.full_name;
        if (obj.Doctor?.full_name) return obj.Doctor.full_name;
        return null;
    })
    name: string;

    @Expose({ groups: ['doctor', 'admin'], name: 'avatar_url' })
    @Transform(({ obj }) => obj.Doctor?.avatar_url ?? null)
    avatar: string;

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