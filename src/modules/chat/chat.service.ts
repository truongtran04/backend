import { Injectable, NotFoundException, ForbiddenException, Logger, forwardRef, Inject } from '@nestjs/common';
import { ChatRepository } from './chat.repository';
import { CreateChatRoomDto, SendMessageDto, UpdateMessageDto } from './dto';
import { ConversationType } from '@prisma/client';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    // Inject Gateway vào đây
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) { }

  /**
   * Tạo hoặc lấy conversation
   */
  async findOrCreateConversation(initiatorId: string, recipientId: string, type: ConversationType = ConversationType.patient_doctor) {
    return await this.chatRepository.findOrCreateConversation(
      initiatorId,
      recipientId,
      type,
    );
  }

  /**
   * Lấy danh sách conversations
   */
  async getUserConversations(userId: string, limit = 50, offset = 0) {
    const conversations = await this.chatRepository.getUserConversations(
      userId,
      limit,
      offset,
    );

    // Tính unread count cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.chatRepository.getUnreadCount(
          userId,
          conv.id,
        );
        return {
          ...conv,
          unreadCount,
          lastMessage: conv.messages[0] || null,
        };
      }),
    );

    return conversationsWithUnread;
  }

  /**
   * Lấy messages
   */
  async getMessages(
    chatRoomId: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    return await this.chatRepository.getConversationMessages(
      userId,
      chatRoomId,
      page,
      pageSize,
    );
  }

  /**
   * Gửi message
   */
   async sendMessage(dto: SendMessageDto, userId: string) {
    // 1. Lưu vào Database
    const message = await this.chatRepository.createMessage(
      userId,
      dto.chatRoomId,
      dto.content,
    );

    // 2. Bắn Socket ngay lập tức
    this.chatGateway.broadcastMessage(dto.chatRoomId, message);

    return message;
  }

  /**
   * Sửa message
   */
  async updateMessage(messageId: string, dto: UpdateMessageDto, userId: string) {
    if (dto.isDeleted) {
      return await this.chatRepository.deleteMessage(userId, messageId);
    }

    if (dto.content) {
      return await this.chatRepository.editMessage(
        userId,
        messageId,
        dto.content,
      );
    }

    throw new ForbiddenException('No update data provided.');
  }

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(chatRoomId: string, userId: string) {
    return await this.chatRepository.markAsRead(userId, chatRoomId);
  }
  
  // Thêm vào ChatService
  async isParticipant(userId: string, chatRoomId: string): Promise<boolean> {
    const participant = await this.chatRepository.isParticipant(userId, chatRoomId);
    return !!participant;
  }
}

