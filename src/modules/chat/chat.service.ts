import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatMessage, ChatRoom } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo hoặc tìm một phòng chat 1-1 giữa hai người dùng.
   */
  private async findOrCreateChatRoom(
    userId1: string,
    userId2: string,
  ): Promise<ChatRoom> {
    // Tìm phòng chat có chính xác 2 người tham gia này
    const chatRoom = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { user_id: userId1 } } },
          { participants: { some: { user_id: userId2 } } },
        ],
        // Đảm bảo phòng chat chỉ có 2 người này
        participants: {
          every: { user_id: { in: [userId1, userId2] } },
        },
      },
    });

    if (chatRoom) {
      return chatRoom;
    }

    // Nếu không có, tạo phòng mới
    const newChatRoom = await this.prisma.chatRoom.create({
      data: {
        participants: {
          create: [{ user_id: userId1 }, { user_id: userId2 }],
        },
      },
    });

    return newChatRoom;
  }

  async createConversation(userId1: string, userId2: string): Promise<ChatRoom> {
    return this.findOrCreateChatRoom(userId1, userId2);
  }

  async createMessage(
    senderId: string,
    recipientId: string,
    content: string,
  ): Promise<ChatMessage> {
    const chatRoom = await this.findOrCreateChatRoom(senderId, recipientId);

    return this.prisma.chatMessage.create({
      data: {
        content: content,
        senderId: senderId,
        chatRoomId: chatRoom.id,
      },
    });
  }

  async getConversations(userId: string) {
    // Lấy tất cả các phòng chat mà người dùng này tham gia
    const chatRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            user_id: userId,
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
            user_id: {
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

  async searchUsers(name: string, role: string, currentUserId: string) {
    if (role === 'doctor') {
      return this.prisma.doctor.findMany({
        where: {
          full_name: {
            contains: name,
            mode: 'insensitive',
          },
          NOT: {
            user_id: currentUserId,
          },
        },
        include: {
          User: true,
          Specialty: true,
        },
      });
    }

    const whereCondition: any = {
      NOT: {
        id: currentUserId,
      },
    };

    if (name) {
      whereCondition.OR = [
        {
          first_name: {
            contains: name,
            mode: 'insensitive',
          },
        },
        {
          last_name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (role) {
      whereCondition.role = role;
    }

    return this.prisma.user.findMany({
      where: whereCondition,
      include: {
        Patient: true,
        Doctor: true,
      },
    });
  }
}