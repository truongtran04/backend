// src/chat/chat.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRepository } from './chat.repository';
import { ConversationType, Prisma } from '@prisma/client';


// -------------------------
// 1️⃣ Định nghĩa kiểu trả về cho messages và rooms
// -------------------------
const chatMessageWithSender = Prisma.validator<Prisma.ChatMessageDefaultArgs>()({
  include: {
    sender: {
      select: {
        user_id: true,
        role: true,
        Doctor: { select: { full_name: true, avatar_url: true } },
        Patient: { select: { full_name: true } },
      },
    },
  },
});

const chatRoomWithDetails = Prisma.validator<Prisma.ChatRoomDefaultArgs>()({
  include: {
    participants: {
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            role: true,
            Doctor: {
              select: {
                full_name: true,
                avatar_url: true,
              }
            },
            Patient: {
              select: {
                full_name: true,
              }
            },
          },
        },
      },
    },
    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
  },
});

export type ChatMessageWithSender = Prisma.ChatMessageGetPayload<typeof chatMessageWithSender>;
export type ChatRoomWithDetails = Prisma.ChatRoomGetPayload<typeof chatRoomWithDetails>;

// -------------------------
// 2️⃣ Service
// -------------------------
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatRepository: ChatRepository
  ) {}

  /**
   * Tìm hoặc tạo phòng chat
   */
  async findOrCreateChatRoom(
    initiatorId: string,
    recipientId: string,
    type?: ConversationType
  ) {
    return await this.chatRepository.findOrCreateConversation(
      initiatorId,
      recipientId,
      type
    );
  }

  /**
   * Lấy tất cả phòng chat của user
   */
  async getUserChatRooms(userId: string, limit = 50, offset = 0) {
    return await this.chatRepository.getUserConversations(userId, limit, offset);
  }

  /**
   * Lấy phòng chat theo type
   */
  async getConversationsByType(
    userId: string,
    type: ConversationType,
    limit = 50,
    offset = 0
  ) {
    return await this.chatRepository.getConversationsByType(userId, type, limit, offset);
  }

  /**
   * Tìm kiếm conversations
   */
  async searchConversations(userId: string, query: string, limit = 10) {
    return await this.chatRepository.searchConversations(userId, query, limit);
  }

  /**
   * Lấy lịch sử tin nhắn
   */
  async getChatMessages(
    userId: string,
    chatRoomId: string,
    page = 1,
    pageSize = 20
  ) {
    return await this.chatRepository.getConversationMessages(userId, chatRoomId, page, pageSize);
  }

  /**
   * Tạo tin nhắn mới
   */
  async createMessage(
    senderId: string,
    chatRoomId: string,
    content: string
  ): Promise<ChatMessageWithSender> {
    return await this.chatRepository.createMessage(senderId, chatRoomId, content);
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(userId: string, chatRoomId: string, messageId?: string) {
    return await this.chatRepository.markAsRead(userId, chatRoomId, messageId);
  }

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(userId: string, messageId: string) {
    return await this.chatRepository.deleteMessage(userId, messageId);
  }

  /**
   * Chỉnh sửa tin nhắn
   */
  async editMessage(userId: string, messageId: string, newContent: string) {
    return await this.chatRepository.editMessage(userId, messageId, newContent);
  }

  /**
   * Lấy thông tin conversation
   */
  async getConversationDetails(userId: string, chatRoomId: string) {
    return await this.chatRepository.getConversationDetails(userId, chatRoomId);
  }

  /**
   * Lấy danh sách có thể chat
   */
  async getAvailableChatRecipients(userId: string) {
    return await this.chatRepository.getAvailableChatRecipients(userId);
  }

  /**
   * Lấy unread count
   */
  async getUnreadCount(userId: string, chatRoomId: string) {
    return await this.chatRepository.getUnreadCount(userId, chatRoomId);
  }

  /**
   * Lấy tất cả unread count của user
   */
  async getAllUnreadCounts(userId: string) {
    const conversations = await this.chatRepository.getUserConversations(userId);
    const unreadCounts: { [key: string]: number } = {};

    for (const conversation of conversations) {
      const count = await this.getUnreadCount(userId, conversation.id);
      if (count > 0) {
        unreadCounts[conversation.id] = count;
      }
    }

    return unreadCounts;
  }
}

