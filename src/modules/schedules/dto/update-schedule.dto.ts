import { IsNotEmpty} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateScheduleDTO {

  @IsNotEmpty({ message: 'schedule_date không được để trống' })
  schedule_date: string;

  @IsNotEmpty({ message: 'start_time không được để trống' })
  start_time: string;

  @IsNotEmpty({ message: 'end_time không được để trống' })
  end_time: string;
}

export class UpdatePatchScheduleDTO extends PartialType(UpdateScheduleDTO) {}

