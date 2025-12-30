import { IsString, IsOptional } from 'class-validator';

export class SearchConversationDto {
  @IsString()
  query: string;

  @IsOptional()
  limit?: number;
}
