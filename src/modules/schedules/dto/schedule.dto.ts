import { Expose, Transform, TransformFnParams } from "class-transformer";
import { ToLocalDate, ToLocalTime, ToLocalISOString } from "src/utils/date-transformer";


export class ScheduleDTO {
    @Expose({ name: 'schedule_id' })
    id: string;

    @Expose({ name: 'doctor_id' })
    @Transform(({ obj }) => obj.Doctor.doctor_id ?? null)
    doctor_id: string;
    
    @Expose()
    @Transform(({ obj }) => obj.Doctor.full_name ?? null)
    doctor_name: string;

    @Expose()
    @Transform(ToLocalDate())
    schedule_date: string;

    @Expose()
    @Transform(ToLocalTime())
    start_time: string;

    @Expose()
    @Transform(ToLocalTime())
    end_time: string;

    @Expose()
    is_available: boolean;
    
    @Expose()
    is_deleted: boolean;

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createdAt: string;

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: string;
}
