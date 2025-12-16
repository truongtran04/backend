import { Controller, Post, Body, Get, Param, Query, Req, UseGuards, Put, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard, GuardType } from 'src/common/guards/jwt-auth.guard';
import { common } from 'src/config/constant';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { SearchConversationDto } from './dto/search-conversation.dto';

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

  /**
   * Tạo hoặc lấy cuộc trò chuyện với một người dùng
   */
  @Post('conversations')
  async initiateChat(
    @Req() req: AuthenticatedRequest, 
    @Body() body: CreateConversationDto
    ): Promise<Record<string, unknown>> {
    const initiatorId: string = req.user.userId;
    const { recipientId, type } = body;
    return await this.chatService.findOrCreateChatRoom(initiatorId, recipientId, type);
  }

  /**
   * Lấy tất cả cuộc trò chuyện của user hiện tại
   */
  @Get('conversations')
  async getUserChatRooms(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ): Promise<Record<string, unknown>[]> {
    const userId = req.user.userId;
    return await this.chatService.getUserChatRooms(userId, parseInt(limit), parseInt(offset));
  }

  /**
   * Lấy cuộc trò chuyện theo loại (patient_doctor hoặc doctor_doctor)
   */
  @Get('conversations/type/:type')
  async getConversationsByType(
    @Req() req: AuthenticatedRequest,
    @Param('type') type: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ): Promise<Record<string, unknown>[]> {
    const userId = req.user.userId;
    return await this.chatService.getConversationsByType(
      userId,
      type as any,
      parseInt(limit),
      parseInt(offset)
    );
  }

  /**
   * Tìm kiếm cuộc trò chuyện
   */
  @Post('conversations/search')
  async searchConversations(
    @Req() req: AuthenticatedRequest,
    @Body() body: SearchConversationDto
  ): Promise<Record<string, unknown>[]> {
    const userId = req.user.userId;
    return await this.chatService.searchConversations(userId, body.query, body.limit || 10);
  }

  /**
   * Lấy thông tin chi tiết của một cuộc trò chuyện
   */
  @Get('conversations/:roomId/details')
  async getConversationDetails(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    return await this.chatService.getConversationDetails(userId, roomId);
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc trò chuyện
   */
  @Get('conversations/:roomId/messages')
  async getChatMessages(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<Record<string, unknown>[]> {
    const userId = req.user.userId;
    console.log(`[ChatController] GET messages - userId=${userId} (from token), roomId=${roomId}`);
    return await this.chatService.getChatMessages(userId, roomId, parseInt(page), parseInt(pageSize));
  }

  /**
   * Gửi tin nhắn vào một cuộc trò chuyện
   */
  @Post('conversations/:roomId/messages')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Body() body: SendMessageDto,
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    const { content } = body;
    const message = await this.chatService.createMessage(userId, roomId, content);

    // Phát tin nhắn qua WebSocket
    this.chatGateway.server.to(roomId).emit('privateMessage', message);

    return message;
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  @Put('conversations/:roomId/mark-as-read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
    @Body() body: MarkAsReadDto
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    return await this.chatService.markAsRead(userId, roomId, body.lastReadMessageId);
  }

  /**
   * Xóa tin nhắn
   */
  @Delete('messages/:messageId')
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    return await this.chatService.deleteMessage(userId, messageId);
  }

  /**
   * Chỉnh sửa tin nhắn
   */
  @Put('messages/:messageId')
  async editMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() body: SendMessageDto
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    return await this.chatService.editMessage(userId, messageId, body.content);
  }

  /**
   * Lấy danh sách các người có thể chat
   */
  @Get('recipients')
  async getAvailableChatRecipients(
    @Req() req: AuthenticatedRequest
  ): Promise<Record<string, unknown>[]> {
    const userId = req.user.userId;
    return await this.chatService.getAvailableChatRecipients(userId);
  }

  /**
   * Lấy số lượng tin nhắn chưa đọc của một cuộc trò chuyện
   */
  @Get('conversations/:roomId/unread-count')
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    const count = await this.chatService.getUnreadCount(userId, roomId);
    return { unreadCount: count };
  }

  /**
   * Lấy tất cả unread counts
   */
  @Get('unread-counts')
  async getAllUnreadCounts(
    @Req() req: AuthenticatedRequest
  ): Promise<Record<string, unknown>> {
    const userId = req.user.userId;
    const counts = await this.chatService.getAllUnreadCounts(userId);
    return { unreadCounts: counts };
  }
}

