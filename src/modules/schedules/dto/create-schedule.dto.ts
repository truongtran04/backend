import { IsNotEmpty, IsDateString } from "class-validator";

export class CreateScheduleDTO {
  
    @IsNotEmpty({ message: 'schedule_date không được để trống' })
    schedule_date: string;

    @IsNotEmpty({ message: 'start_time không được để trống' })
    start_time: string;

    @IsNotEmpty({ message: 'end_time không được để trống' })
    end_time: string;
}
