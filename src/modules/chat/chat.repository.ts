import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, Prisma } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo hoặc lấy một conversation giữa hai users
   * Hỗ trợ cả patient-doctor và doctor-doctor conversations
   */
  async findOrCreateConversation(
    initiatorId: string,
    recipientId: string,
    type: ConversationType = ConversationType.patient_doctor,
  ) {
    console.log(`[ChatRepo] findOrCreateConversation: initiator=${initiatorId}, recipient=${recipientId}`);
    
    if (!initiatorId || !recipientId) {
      throw new ForbiddenException('Invalid user IDs.');
    }

    if (initiatorId === recipientId) {
      throw new ForbiddenException('Cannot create conversation with yourself.');
    }

    // Kiểm tra cả hai users tồn tại
    const [user1, user2] = await Promise.all([
      this.prisma.user.findUnique({ where: { user_id: initiatorId } }),
      this.prisma.user.findUnique({ where: { user_id: recipientId } }),
    ]);

    if (!user1 || !user2) {
      console.error(`[ChatRepo] Users not found - user1: ${user1?.user_id}, user2: ${user2?.user_id}`);
      throw new ForbiddenException('One or both users not found.');
    }

    console.log(`[ChatRepo] Users found: ${user1.user_id} (${user1.role}), ${user2.user_id} (${user2.role})`);

    // Xác định conversation type dựa trên roles
    let conversationType = type;
    if (user1.role === 'doctor' && user2.role === 'doctor') {
      conversationType = ConversationType.doctor_doctor;
    } else {
      conversationType = ConversationType.patient_doctor;
    }

    // Tìm conversation hiện tại
    const existingRooms = await this.prisma.chatRoom.findMany({
      where: {
        type: conversationType,
        participants: {
          every: {
            userId: { in: [initiatorId, recipientId] },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                Doctor: true,
                Patient: true,
              },
            },
          },
        },
      },
    });

    // Lọc room chỉ có 2 participants và có cả 2 users
    const privateRoom = existingRooms.find(
      (room) =>
        room.participants.length === 2 &&
        room.participants.some((p) => p.userId === initiatorId) &&
        room.participants.some((p) => p.userId === recipientId),
    );

    if (privateRoom) {
      console.log(`[ChatRepo] Found existing room: ${privateRoom.id}`);
      return privateRoom;
    }

    // Tạo conversation mới
    console.log(`[ChatRepo] Creating new room with participants: ${initiatorId}, ${recipientId}`);
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: conversationType,
        participants: {
          create: [{ userId: initiatorId }, { userId: recipientId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                Doctor: true,
                Patient: true,
              },
            },
          },
        },
      },
    });
    
    console.log(`[ChatRepo] Created new room: ${newRoom.id} with ${newRoom.participants.length} participants`);
    console.log(`[ChatRepo] Participants: ${newRoom.participants.map(p => p.userId).join(', ')}`);

    return newRoom;
  }

  /**
   * Lấy tất cả conversations của một user
   */
  async getUserConversations(userId: string, limit = 50, offset = 0) {
    const conversations = await this.prisma.chatRoom.findMany({
      where: {
        participants: { some: { userId } },
      },
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
                    doctor_id: true,
                    full_name: true,
                    avatar_url: true,
                    title: true,
                    Specialty: { select: { name: true } },
                  },
                },
                Patient: {
                  select: {
                    patient_id: true,
                    full_name: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isDeleted: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return conversations;
  }

  /**
   * Lấy conversations theo type (patient_doctor hoặc doctor_doctor)
   */
  async getConversationsByType(
    userId: string,
    type: ConversationType,
    limit = 50,
    offset = 0,
  ) {
    return await this.prisma.chatRoom.findMany({
      where: {
        type,
        participants: { some: { userId } },
      },
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
                    title: true,
                  },
                },
                Patient: {
                  select: {
                    full_name: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Tìm kiếm conversations dựa trên tên bác sĩ/bệnh nhân
   */
  async searchConversations(userId: string, query: string, limit = 10) {
    const conversations = await this.prisma.chatRoom.findMany({
      where: {
        AND: [
          { participants: { some: { userId } } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { Doctor: { full_name: { contains: query, mode: 'insensitive' } } },
                    { Patient: { full_name: { contains: query, mode: 'insensitive' } } },
                  ],
                },
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                user_id: true,
                role: true,
                Doctor: {
                  select: {
                    full_name: true,
                    avatar_url: true,
                    title: true,
                  },
                },
                Patient: {
                  select: {
                    full_name: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: limit,
    });

    return conversations;
  }

  /**
   * Lấy lịch sử tin nhắn của một conversation
   */
  async getConversationMessages(
    userId: string,
    chatRoomId: string,
    page = 1,
    pageSize = 20,
  ) {
    console.log(`[ChatRepo] getConversationMessages: userId=${userId}, roomId=${chatRoomId}, page=${page}`);
    
    // Kiểm tra user có quyền truy cập
    const isParticipant = await this.prisma.chatParticipant.findUnique({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId,
        },
      },
    });

    if (!isParticipant) {
      // Log debugging information
      console.error(`[ChatRepo] ❌ Access Denied - User: ${userId}, Room: ${chatRoomId}`);
      
      // Check all participants in this room
      const allParticipants = await this.prisma.chatParticipant.findMany({
        where: { chatRoomId },
        select: { userId: true },
      });
      console.error(`[ChatRepo] Room participants:`, allParticipants.map(p => p.userId).join(', '));
      
      // Also check if the room exists
      const room = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        select: { id: true, type: true, createdAt: true },
      });
      console.error(`[ChatRepo] Room info: ${room ? `exists, type=${room.type}, created=${room.createdAt}` : 'DOES NOT EXIST'}`);
      
      throw new ForbiddenException('You do not have access to this conversation.');
    }
    
    console.log(`[ChatRepo] ✅ User ${userId} is participant of room ${chatRoomId}`);

    const skip = (page - 1) * pageSize;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        chatRoomId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            role: true,
            Doctor: {
              select: {
                full_name: true,
                avatar_url: true,
              },
            },
            Patient: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    });

    return messages;
  }

  /**
   * Tạo tin nhắn mới
   */
  async createMessage(
    senderId: string,
    chatRoomId: string,
    content: string,
  ) {
    // Kiểm tra sender có phải là participant
    const isParticipant = await this.prisma.chatParticipant.findUnique({
      where: {
        userId_chatRoomId: {
          userId: senderId,
          chatRoomId,
        },
      },
    });

    if (!isParticipant) {
      throw new ForbiddenException('You are not a member of this conversation.');
    }

    if (!content || content.trim().length === 0) {
      throw new ForbiddenException('Message content cannot be empty.');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        senderId,
        chatRoomId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            user_id: true,
            role: true,
            Doctor: {
              select: {
                full_name: true,
                avatar_url: true,
              },
            },
            Patient: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
    });

    // Cập nhật lastMessageAt của chatRoom
    await this.prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Đánh dấu tin nhắn đã được đọc
   */
  async markAsRead(userId: string, chatRoomId: string, messageId?: string) {
    const lastReadAt = new Date();

    const participant = await this.prisma.chatParticipant.update({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId,
        },
      },
      data: {
        lastReadAt,
        lastReadMessageId: messageId,
      },
    });

    return participant;
  }

  /**
   * Xóa tin nhắn (soft delete)
   */
  async deleteMessage(userId: string, messageId: string) {
    // Kiểm tra xem user có phải là sender không
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    return await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  /**
   * Chỉnh sửa tin nhắn
   */
  async editMessage(userId: string, messageId: string, newContent: string) {
    // Kiểm tra xem user có phải là sender không
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    return await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        isEdited: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Lấy thông tin một conversation
   */
  async getConversationDetails(userId: string, chatRoomId: string) {
    const conversation = await this.prisma.chatRoom.findFirst({
      where: {
        id: chatRoomId,
        participants: { some: { userId } },
      },
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
                    title: true,
                  },
                },
                Patient: {
                  select: {
                    full_name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Conversation not found or access denied.');
    }

    return conversation;
  }

  /**
   * Lấy danh sách có thể chat (doctors cho patients, hoặc doctors cho doctors)
   */
  async getAvailableChatRecipients(userId: string) {
    // Lấy thông tin user hiện tại
    const currentUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        Doctor: true,
        Patient: true,
      },
    });

    if (!currentUser) {
      throw new ForbiddenException('User not found.');
    }

    let recipients;

    if (currentUser.role === 'patient') {
      // Bệnh nhân có thể chat với bác sĩ
      recipients = await this.prisma.user.findMany({
        where: {
          role: 'doctor',
          Doctor: {
            is_available: true,
          },
        },
        include: {
          Doctor: {
            include: {
              Specialty: true,
            },
          },
        },
        orderBy: {
          Doctor: {
            full_name: 'asc',
          },
        },
      });
    } else if (currentUser.role === 'doctor') {
      // Bác sĩ có thể chat với bệnh nhân hoặc bác sĩ khác
      recipients = await this.prisma.user.findMany({
        where: {
          OR: [
            { role: 'patient' },
            {
              AND: [
                { role: 'doctor' },
                { user_id: { not: userId } },
              ],
            },
          ],
        },
        include: {
          Doctor: {
            include: {
              Specialty: true,
            },
          },
          Patient: true,
        },
        orderBy: [
          {
            Doctor: {
              full_name: 'asc',
            },
          },
          {
            Patient: {
              full_name: 'asc',
            },
          },
        ],
      });
    }

    return recipients || [];
  }

  /**
   * Lấy unread message count
   */
  async getUnreadCount(userId: string, chatRoomId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId,
        },
      },
    });

    if (!participant) {
      return 0;
    }

    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        chatRoomId,
        createdAt: {
          gt: participant.lastReadAt || new Date(0),
        },
        isDeleted: false,
      },
    });

    return unreadCount;
  }
}
