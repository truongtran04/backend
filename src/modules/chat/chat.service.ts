import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatMessage } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo hoặc tìm một phòng chat 1-1 giữa hai người dùng.
   */
  private async findOrCreateChatRoom(
    userId1: string,
    userId2: string,
  ): Promise<string> {
    // Tìm phòng chat có chính xác 2 người tham gia này
    const chatRoom = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId1 } } },
          { participants: { some: { id: userId2 } } },
          { participants: { every: { id: { in: [userId1, userId2] } } } },
        ],
      },
    });

    if (chatRoom) {
      return chatRoom.id;
    }

    // Nếu không có, tạo phòng mới
    const newChatRoom = await this.prisma.chatRoom.create({
      data: {
        participants: { 
          create: [{ userId: userId1 }, { userId: userId2 }],
        }, 
      },
    });

    return newChatRoom.id;
  }

  async createMessage(
    senderId: string,
    recipientId: string,
    content: string,
  ): Promise<ChatMessage> {
    const chatRoomId = await this.findOrCreateChatRoom(senderId, recipientId);

    return this.prisma.chatMessage.create({
      data: {
        content: content,
        senderId: senderId,
        chatRoomId: chatRoomId,
      },
    });
  }

  async getConversations(userId: string) {
    // Lấy tất cả các phòng chat mà người dùng này tham gia
    const chatRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        // Lấy tin nhắn cuối cùng trong mỗi phòng
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        // Lấy thông tin của những người tham gia khác (không phải user hiện tại)
        participants: {
          where: {
            id: {
              not: userId,
            },
          },
          include: {
            user: {
              include: {
                Patient: true,
                Doctor: true,
              },
            },
          },
        },
      },
    });

    // Lọc ra những phòng có tin nhắn và sắp xếp theo tin nhắn mới nhất
    return chatRooms
      .filter((room) => room.messages.length > 0)
      .sort(
        (a, b) =>
          b.messages[0].createdAt.getTime() -
          a.messages[0].createdAt.getTime(),
      );
  }

  async getMessageHistory(chatRoomId: string) {
    return this.prisma.chatMessage.findMany({
      where: { chatRoomId: chatRoomId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}