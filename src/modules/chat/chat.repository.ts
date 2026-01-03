import { Injectable, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType } from '@prisma/client';

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(ChatRepository.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Tạo hoặc lấy một conversation giữa hai users
   * Fix: Sửa lỗi logic tìm kiếm conversation
   */
  async findOrCreateConversation(
    initiatorId: string,
    recipientId: string,
    type: ConversationType = ConversationType.patient_doctor,
  ) {
    this.logger.log(`Tìm kiếm hoặc tạo cuộc hội thoại: ${initiatorId} -> ${recipientId}`,);

    if (!initiatorId || !recipientId) {
      throw new ForbiddenException('Lỗi không xác định người dùng.');
    }

    if (initiatorId === recipientId) {
      throw new ForbiddenException(
        'Không thể tạo cuộc hội thoại với chính mình.',
      );
    }

    const [user1, user2] = await Promise.all([
      this.prisma.user.findUnique({
        where: { user_id: initiatorId },
        select: { user_id: true, role: true },
      }),
      this.prisma.user.findUnique({
        where: { user_id: recipientId },
        select: { user_id: true, role: true },
      }),
    ]);

    if (!user1 || !user2) {
      this.logger.error(
        `Không tìm thấy người dùng - initiator: ${initiatorId}, recipient: ${recipientId}`,
      );
      throw new ForbiddenException('Một hoặc cả hai người dùng không tồn tại.');
    }

    let conversationType = type;

    if (user1.role === 'doctor' && user2.role === 'doctor') {
      conversationType = ConversationType.doctor_doctor;
    } else {
      conversationType = ConversationType.patient_doctor;
    }

    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: conversationType,
        AND: [
          { participants: { some: { userId: initiatorId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        participants: {
          select: {
            userId: true,
            chatRoomId: true,
            lastReadMessageId: true,
            lastReadAt: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                user_id: true,
                role: true,
                Doctor: {
                  select: {
                    doctor_id: true,
                    full_name: true,
                    avatar_url: true,
                    Specialty: {
                      select: { name: true },
                    },
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
      },
    });

    if (existingRoom && existingRoom.participants.length === 2) {
      this.logger.log(`Đã tìm thấy phòng: ${existingRoom.id}`);
      return existingRoom;
    }

    this.logger.log(`Đang tạo phòng mới: ${initiatorId}, ${recipientId}`);

    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: conversationType,
        lastMessageAt: new Date(),
        participants: {
          create: [{ userId: initiatorId }, { userId: recipientId }],
        },
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        participants: {
          select: {
            userId: true,
            chatRoomId: true,
            lastReadMessageId: true,
            lastReadAt: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                user_id: true,
                role: true,
                Doctor: {
                  select: {
                    doctor_id: true,
                    full_name: true,
                    avatar_url: true,
                    Specialty: {
                      select: { name: true },
                    },
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
      },
    });

    this.logger.log(`Đã tạo phòng mới: ${newRoom.id}`);
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
                role: true,
                Doctor: {
                  select: {
                    doctor_id: true,
                    full_name: true,
                    avatar_url: true,
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
          where: { isDeleted: false }, // Chỉ lấy tin nhắn chưa xóa
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isDeleted: true,
            isEdited: true,
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
   * Lấy messages với pagination
   */
  async getConversationMessages(
    userId: string,
    chatRoomId: string,
    page = 1,
    pageSize = 20,
  ) {
    this.logger.log(
      `getConversationMessages: ${userId}, ${chatRoomId}, page=${page}`,
    );

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
      this.logger.error(`Access Denied - User: ${userId}, Room: ${chatRoomId}`);
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }

    const skip = (page - 1) * pageSize;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.chatMessage.count({
        where: {
          chatRoomId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      messages: messages.reverse(), // Đảo ngược để tin nhắn cũ ở trên
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Tạo tin nhắn mới
   */
  async createMessage(senderId: string, chatRoomId: string, content: string) {
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
      throw new BadRequestException('Bạn không phải là thành viên của cuộc trò chuyện này.');
    }

    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống.');
    }

    const now = new Date();

    // Tạo tin nhắn và cập nhật chatRoom trong một transaction
    const [message, _] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
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
      }),
      // Cập nhật lastMessageAt
      this.prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: { lastMessageAt: now },
      }),
    ]);

    return message;
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(userId: string, chatRoomId: string) {
    const lastReadAt = new Date();

    // Lấy tin nhắn mới nhất trong room
    const latestMessage = await this.prisma.chatMessage.findFirst({
      where: {
        chatRoomId,
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const participant = await this.prisma.chatParticipant.update({
      where: {
        userId_chatRoomId: {
          userId,
          chatRoomId,
        },
      },
      data: {
        lastReadAt,
        lastReadMessageId: latestMessage?.id, // Cập nhật ID tin nhắn mới nhất
      },
    });

    return participant;
  }

  /**
   * Xóa tin nhắn (soft delete)
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new ForbiddenException('Tin nhắn không tồn tại.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể xóa tin nhắn của mình.');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Tin nhắn đã bị xóa trước đó.');
    }

    return await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Chỉnh sửa tin nhắn
   */
  async editMessage(userId: string, messageId: string, newContent: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new ForbiddenException('Tin nhắn không tồn tại.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể sửa tin nhắn của mình.');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Không thể sửa tin nhắn đã bị xóa.');
    }

    if (!newContent || newContent.trim().length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống.');
    }

    return await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        isEdited: true,
        updatedAt: new Date(),
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
  }

  /**
   * Lấy unread count
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
        senderId: { not: userId }, // Không đếm tin nhắn của chính mình
        isDeleted: false,
      },
    });

    return unreadCount;
  }

  async isParticipant(userId: string, chatRoomId: string) {
    return await this.prisma.chatParticipant.findUnique({
      where: {
        userId_chatRoomId: { userId, chatRoomId },
      },
    });
  }
}
