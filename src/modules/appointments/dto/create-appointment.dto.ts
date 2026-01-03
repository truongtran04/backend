import { IsNotEmpty, IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import {AppointmentStatus} from '../appointment.interface';


export class CreateAppointmentDTO {
  
  @IsNotEmpty({ message: 'doctor_id không được để trống' })
  @IsString({ message: 'doctor_id phải là chuỗi' })
  doctor_id: string;

  @IsNotEmpty({ message: 'schedule_id không được để trống' })
  @IsString({ message: 'schedule_id phải là chuỗi' })
  schedule_id: string;

  @IsOptional()
  @IsString({ message: 'symptoms phải là chuỗi nếu có' })
  symptoms?: string;

  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi nếu có' })
  notes?: string;

  @IsNotEmpty({ message: 'status không được để trống' })
  @IsEnum(AppointmentStatus, { message: 'status phải là một trong các giá trị: pending, confirmed, completed, cancelled, no_show' })
  status: AppointmentStatus;

  @IsOptional()
  @IsString({ message: 'cancellation_reason phải là chuỗi nếu có' })
  cancellation_reason?: string;
}
