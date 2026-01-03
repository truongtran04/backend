import { IsEnum, IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateChatRoomDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  participantIds: string[];
}