// src/chat/chat.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRoom, Prisma } from '@prisma/client';


// -------------------------
// 1️⃣ Định nghĩa kiểu trả về cho messages và rooms
// -------------------------
const chatMessageWithSender = Prisma.validator<Prisma.ChatMessageDefaultArgs>()({
  include: {
    sender: {
      select: {
        user_id: true,
        role: true,
        Doctor: { select: { full_name: true } },
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
  constructor(private readonly prisma: PrismaService) {}

  // Tìm hoặc tạo phòng chat
  async findOrCreateChatRoom(initiatorId: string, recipientId: string): Promise<ChatRoom> {
    // 🔹 Ép kiểu chắc chắn cho ID
    if (!initiatorId || !recipientId) {
      throw new ForbiddenException('Invalid user IDs.');
    }

    // 🔹 Kiểm tra xem cả hai người dùng có tồn tại không
    const [user1, user2] = await Promise.all([
      this.prisma.user.count({ where: { user_id: initiatorId } }),
      this.prisma.user.count({ where: { user_id: recipientId } }),
    ]);

    if (user1 === 0 || user2 === 0) {
      throw new ForbiddenException('One or both users not found.');
    }

    // 🔹 Đã loại bỏ logic kiểm tra vai trò.
    // Giờ đây, bất kỳ hai người dùng nào cũng có thể tạo phòng chat.
    // Logic bảo mật đã được đảm bảo ở tầng gửi tin nhắn (chỉ thành viên mới được gửi).

    // Tìm phòng chat hiện tại giữa hai người
    // 🔹 Tối ưu hóa logic tìm kiếm để đảm bảo chỉ tìm phòng chat 1-1
    const initiatorRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { some: { userId: initiatorId } },
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    // Tìm phòng chỉ có 2 người và người còn lại là recipient
    const privateRoom = initiatorRooms.find(room => 
      room.participants.length === 2 && 
      room.participants.some(p => p.userId === recipientId)
    );
    if (privateRoom) return privateRoom;

    // Tạo mới nếu chưa có
    const newRoom: ChatRoom = await this.prisma.chatRoom.create({
      data: {
        participants: {
          create: [
            { userId: initiatorId },
            { userId: recipientId },
          ],
        },
      },
    });

    return newRoom;
  }

  // Lấy tất cả phòng chat của một user
  getUserChatRooms(userId: string): Promise<ChatRoomWithDetails[]> {
    return this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: chatRoomWithDetails.include,
    });
  }

  // Lấy lịch sử tin nhắn của một phòng
  async getChatMessages(
    userId: string,
    chatRoomId: string,
    page = 1,
    pageSize = 20
  ): Promise<ChatMessageWithSender[]> {
    const skip = (page - 1) * pageSize;

    // 🔹 Kiểm tra xem user có phải là thành viên của phòng chat không
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: chatRoomId,
        participants: {
          some: { userId: userId },
        },
      },
    });

    if (!room) {
      throw new ForbiddenException('You do not have access to this chat room.');
    }

    const messages: ChatMessageWithSender[] = await this.prisma.chatMessage.findMany({
      where: { chatRoomId },
      include: chatMessageWithSender.include,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return messages.reverse(); // trả về theo thứ tự cũ → mới
  }

  // Tạo tin nhắn mới
  async createMessage(
    senderId: string,
    chatRoomId: string,
    content: string
  ): Promise<ChatMessageWithSender> {
    if (!senderId || !chatRoomId || !content) {
      throw new ForbiddenException('Missing required fields for message creation.');
    }

    // 🔹 Thêm kiểm tra: người gửi có phải là thành viên của phòng chat không
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        userId_chatRoomId: {
          userId: senderId,
          chatRoomId: chatRoomId,
        },
      },
    });

    // Nếu không tìm thấy, tức là người dùng không có trong phòng chat
    if (!participant) {
      throw new ForbiddenException('You are not a member of this chat room and cannot send messages.');
    }

    const message: ChatMessageWithSender = await this.prisma.chatMessage.create({
      data: {
        senderId,
        chatRoomId,
        content,
      },
      include: chatMessageWithSender.include,
    });

    return message;
  }
}
