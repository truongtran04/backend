import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import type { Request } from 'express';
import { ApiResponse } from 'src/common/bases/api-reponse';
import { IAuthUser } from '../auth/auth.interface';

@Controller('v1/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Req() req: Request & { user: IAuthUser }): Promise<ApiResponse> {
    const userId = req.user?.userId;
    const conversations = await this.chatService.getConversations(userId);
    return ApiResponse.suscess(conversations, 'Lấy danh sách hội thoại thành công');
  }

  @Get('history/:chatRoomId')
  async getMessageHistory(@Req() req: Request, 
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<ApiResponse> { // req.user is already guaranteed by JwtAuthGuard
    const userId = (req.user as IAuthUser).userId;
    const history = await this.chatService.getMessageHistory(chatRoomId);
    return ApiResponse.suscess(history, 'Lấy lịch sử tin nhắn thành công');
  }
}