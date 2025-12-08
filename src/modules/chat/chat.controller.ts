import { Controller, Post, Body, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { IsString } from 'class-validator';
import { JwtAuthGuard, GuardType } from 'src/common/guards/jwt-auth.guard';
import { common } from 'src/config/constant';
import { ChatGateway } from './chat.gateway';

// DTO để validate body của request
class InitiateChatDto {
    @IsString()
    recipientId: string;
}

class SendMessageDto {
    @IsString()
    content: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
    guard: string;
  };
}

@Controller('v1/chat')
@GuardType(common.admin)
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    ) {}

  // API để bắt đầu cuộc trò chuyện
  @Post('initiate')
  async initiateChat(
    @Req() req: AuthenticatedRequest, 
    @Body() body: InitiateChatDto
    ): Promise<any> {
    const initiatorId: string = req.user.userId; // Sử dụng req.user.userId
    const recipientId: string = body.recipientId;
    return await this.chatService.findOrCreateChatRoom(initiatorId, recipientId);
  }

  // API để lấy tất cả phòng chat của user hiện tại
  @Get('rooms')
  async getUserChatRooms(@Req() req: AuthenticatedRequest): Promise<any[]> {
    const userId = req.user.userId; // Sử dụng req.user.userId
    return this.chatService.getUserChatRooms(userId);
  }

  // API để lấy lịch sử tin nhắn của một phòng
  @Get('rooms/:roomId/messages')
  async getChatMessages(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<any[]> {
    const userId = req.user.userId;
    return this.chatService.getChatMessages(userId, roomId, parseInt(page), parseInt(pageSize));
  }

  // API để gửi tin nhắn vào một phòng
  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Body() body: SendMessageDto,
  ): Promise<any> {
    const userId = req.user.userId;
    const { content } = body;
    const message = await this.chatService.createMessage(userId, roomId, content);

    // Phát tin nhắn qua WebSocket
    this.chatGateway.server.to(roomId).emit('receiveMessage', message);

    return message;
  }
}
