import { Expose, Transform, TransformFnParams } from "class-transformer";
import { ToLocalDate, ToLocalTime, ToLocalISOString } from "src/utils/date-transformer";

export class AppointmentDTO {
    
    @Expose({ name: 'appointment_id' })
    id: string;

    @Expose({ groups: ['doctor', 'admin'] })
    @Transform(({ obj }) => obj.Patient.full_name ?? null)
    patient_name: string;

    @Expose({ groups: ['patient', 'admin'] })
    @Transform(({ obj }) => obj.Doctor.full_name ?? null)
    doctor_name: string;     

    @Expose()
    @Transform(({ obj }) => obj.DoctorSchedule.schedule_date ?? null)
    @Transform(ToLocalDate())
    schedule_date: string;

    @Expose()
    @Transform(({ obj }) => obj.DoctorSchedule.start_time ?? null)
    @Transform(ToLocalTime())
    start_time: string;

    @Expose()
    @Transform(({ obj }) => obj.DoctorSchedule.end_time ?? null)
    @Transform(ToLocalTime())
    end_time: string;

    @Expose()
    symptoms?: string;

    @Expose()
    notes?: string;

    @Expose()
    status: string;

    cancellation_reason?: string;

    @Expose({ name: 'created_at' })
    @Transform(ToLocalISOString())
    createdAt: string;

    @Expose({ name: 'updated_at' })
    @Transform(ToLocalISOString())
    updatedAt: string;
}