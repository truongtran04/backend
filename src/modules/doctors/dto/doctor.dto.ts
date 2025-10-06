import { Expose, Exclude, Transform, TransformFnParams } from "class-transformer";
import { ToLocalISOString } from "src/utils/date-transformer";

export class DoctorDTO {

    @Expose({name: 'doctor_id'})
    id: string;
    
    @Expose()
    user_id: string;
    
    @Expose()
    @Transform(({ obj }) => obj.User.email ?? null)
    email: string;

    @Expose()
    @Transform(({ obj }) => obj.Specialty.name ?? null)
    specialty_name: string;

    @Expose()
    full_name: string;

    @Expose()
    title?: string;

    @Expose()
    introduction: string;

    @Expose()
    avatar_url: string;

    @Expose()
    specializations: string;

    @Expose()
    work_experience: string;

    @Expose()
    achievements: string;

    @Expose()
    experience_years: number;

    @Expose()
    is_available: boolean;

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createAt: Date

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: Date
}