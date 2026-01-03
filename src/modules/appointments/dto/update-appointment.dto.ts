import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { AppointmentStatus } from '../appointment.interface';
import { Transform } from 'class-transformer';

export class UpdateAppointmentDTO {
  
  @IsOptional()
  @IsString({ message: 'doctor_id phải là chuỗi nếu có' })
  doctor_id?: string;

  @IsOptional()
  @IsString({ message: 'schedule_id phải là chuỗi nếu có' })
  schedule_id?: string;

  @IsOptional()
  @IsString({ message: 'symptoms phải là chuỗi nếu có' })
  symptoms?: string;

  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi nếu có' })
  notes?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'status phải là một trong các giá trị: pending, confirmed, completed, cancelled, no_show nếu có' })
  status?: AppointmentStatus;

  @IsOptional()
  @IsString({ message: 'cancellation_reason phải là chuỗi nếu có' })
  cancellation_reason?: string;
}
