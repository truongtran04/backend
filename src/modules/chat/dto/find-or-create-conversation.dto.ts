import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class FindOrCreateConversationDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsEnum(ConversationType)
  @IsOptional()
  type?: ConversationType;
}