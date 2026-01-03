import { Expose, Transform, TransformFnParams } from "class-transformer";
import { ToLocalDate, ToLocalTime, ToLocalISOString } from "src/utils/date-transformer";

export class AppointmentDTO {
    
    @Expose({ name: 'appointment_id' })
    id: string;

    @Expose()
    @Transform(({ obj }) => obj.Patient.patient_id ?? null)
    patient_id: string;

    @Expose()
    @Transform(({ obj }) => obj.Patient.full_name ?? null)
    patient_name: string;

    @Expose()
    @Transform(({ obj }) => obj.Doctor?.doctor_id ?? null)
    doctor_id: string;

    @Expose()
    @Transform(({ obj }) => obj.Doctor.full_name ?? null)
    doctor_name: string;     

    // @Expose()
    // @Transform(({ obj }) => obj.Doctor?.Specialty?.name ?? null)
    // doctor_specialty?: string;

    // @Expose()
    // @Transform(({ obj }) => obj.Doctor?.workplace ?? obj.Doctor?.clinic_address ?? null)
    // doctor_workplace?: string;

    // @Expose()
    // @Transform(({ obj }) => obj.Doctor?.avatar_url ?? null)
    // doctor_avatar_url?: string;

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