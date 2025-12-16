import { IsString, IsOptional } from 'class-validator';

export class MarkAsReadDto {
  @IsString()
  @IsOptional()
  lastReadMessageId?: string;
}
