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
    title: string;

    @Expose()
    experience_years: number;

    @Expose()
    specializations: string;

    @Expose()
    position: string;

    @Expose()
    workplace: string;

    @Expose()
    clinic_address: string;

    @Expose()
    introduction: string;

    @Expose()
    achievements: string;

    @Expose()
    avatar_url: string;
    
    @Expose()
    is_available: boolean;

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createdAt: Date

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: Date
}