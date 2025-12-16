import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  recipientId: string;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;
}
