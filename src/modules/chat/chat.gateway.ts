// src/chat/chat.gateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService, ChatMessageWithSender } from './chat.service';
import { WsJwtGuard } from 'src/common/guards/ws-jwt.guard';

interface ConnectedUser {
  userId: string;
  socketId: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  constructor(private readonly chatService: ChatService) {}

  afterInit(): void {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket): void {
    const user = (client as any)['user'] as any;
    if (user?.userId) {
      this.connectedUsers.set(user.userId as string, {
        userId: user.userId as string,
        socketId: client.id,
        role: user.role as string,
      });
      this.logger.log(`Client connected: ${client.id} (User: ${user.userId})`);
      this.server.emit('userOnline', { userId: user.userId, status: 'online' });
    }
  }

  handleDisconnect(client: Socket): void {
    const user = (client as any)['user'] as any;
    if (user?.userId) {
      this.connectedUsers.delete(user.userId as string);
      this.logger.log(`Client disconnected: ${client.id} (User: ${user.userId})`);
      this.server.emit('userOffline', { userId: user.userId, status: 'offline' });
    }
  }

  /**
   * Join a chat room
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string): void {
    void client.join(roomId);
    client.emit('joinedRoom', { roomId, success: true });
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  /**
   * Leave a chat room
   */
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, roomId: string): void {
    void client.leave(roomId);
    this.logger.log(`Client ${client.id} left room ${roomId}`);
  }

  /**
   * Send a private message
   */
  @SubscribeMessage('privateMessage')
  async handleMessage(
    client: Socket,
    payload: { chatRoomId: string; content: string; tempId?: string }
  ): Promise<void> {
    try {
      const user = (client as any)['user'] as any;
      const { chatRoomId, content, tempId } = payload;

      const message: ChatMessageWithSender = await this.chatService.createMessage(
        user.userId as string,
        chatRoomId,
        content
      );

      // If the client provided a tempId for optimistic UI, echo it back so client can dedupe
      if (tempId) {
        (message as any).tempId = tempId;
      }

      // Broadcast message to all users in the room
      this.server.to(chatRoomId).emit('privateMessage', message);
      this.logger.log(`Message sent in room ${chatRoomId} by user ${user.userId}`);
    } catch (error) {
      this.logger.error('Failed to handle message', error);
      // If client provided a tempId, notify them specifically so they can mark the optimistic message as failed
      const tempId = (payload as any).tempId;
      client.emit('messageError', { error: 'Could not send message.', tempId });
    }
  }

  /**
   * Mark message as read
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    client: Socket,
    payload: { chatRoomId: string; messageId?: string }
  ): Promise<void> {
    try {
      const user = (client as any)['user'] as any;
      const { chatRoomId, messageId } = payload;

      await this.chatService.markAsRead(user.userId as string, chatRoomId, messageId);
      this.logger.log(`Messages marked as read in room ${chatRoomId} by user ${user.userId}`);

      // Notify other users in the room
      this.server.to(chatRoomId).emit('userReadMessages', {
        userId: user.userId,
        chatRoomId,
        messageId,
      });
    } catch (error) {
      this.logger.error('Failed to mark as read', error);
      client.emit('markReadError', { error: 'Could not mark as read.' });
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('userTyping')
  handleUserTyping(
    client: Socket,
    payload: { chatRoomId: string; isTyping: boolean }
  ): void {
    const user = (client as any)['user'] as any;
    const { chatRoomId, isTyping } = payload;

    this.server.to(chatRoomId).emit('userTyping', {
      userId: user.userId,
      userName: user.role === 'doctor' ? 'Doctor' : 'Patient',
      isTyping,
      chatRoomId,
    });
  }

  /**
   * Get online status of specific user
   */
  @SubscribeMessage('checkUserStatus')
  handleCheckUserStatus(client: Socket, userId: string): void {
    const isOnline = this.connectedUsers.has(userId);
    client.emit('userStatus', {
      userId,
      isOnline,
      status: isOnline ? 'online' : 'offline',
    });
  }

  /**
   * Get all connected doctors (for patients)
   */
  @SubscribeMessage('getConnectedDoctors')
  handleGetConnectedDoctors(client: Socket): void {
    const connectedDoctors = Array.from(this.connectedUsers.values())
      .filter((user) => user.role === 'doctor')
      .map((user) => ({
        userId: user.userId,
        status: 'online',
      }));

    client.emit('connectedDoctors', connectedDoctors);
  }

  /**
   * Notify about new message in conversation
   */
  async notifyNewMessage(
    roomId: string,
    message: ChatMessageWithSender,
    recipientId: string
  ): Promise<void> {
    // Send notification to specific user in the room
    const recipientSocket = Array.from(this.connectedUsers.values()).find(
      (u) => u.userId === recipientId
    );

    if (recipientSocket) {
      this.server.to(recipientSocket.socketId).emit('newMessageNotification', {
        roomId,
        message,
        from: message.sender.user_id,
      });
    }
  }

  /**
   * Get count of unread messages
   */
  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(
    client: Socket,
    chatRoomId: string
  ): Promise<void> {
    try {
      const user = (client as any)['user'] as any;
      const count = await this.chatService.getUnreadCount(user.userId as string, chatRoomId);

      client.emit('unreadCount', {
        chatRoomId,
        count,
      });
    } catch (error) {
      this.logger.error('Failed to get unread count', error);
      client.emit('unreadCountError', { error: 'Could not get unread count.' });
    }
  }

  /**
   * Delete message event
   */
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(client: Socket, messageId: string): Promise<void> {
    try {
      const user = (client as any)['user'] as any;
      await this.chatService.deleteMessage(user.userId as string, messageId);

      // Broadcast deletion event to all clients
      this.server.emit('messageDeleted', { messageId });
      this.logger.log(`Message ${messageId} deleted by user ${user.userId}`);
    } catch (error) {
      this.logger.error('Failed to delete message', error);
      client.emit('deleteMessageError', { error: 'Could not delete message.' });
    }
  }

  /**
   * Edit message event
   */
  @SubscribeMessage('editMessage')
  async handleEditMessage(
    client: Socket,
    payload: { messageId: string; content: string }
  ): Promise<void> {
    try {
      const user = (client as any)['user'] as any;
      const updatedMessage = await this.chatService.editMessage(
        user.userId as string,
        payload.messageId,
        payload.content
      );

      // Broadcast edited message to all clients
      this.server.emit('messageEdited', updatedMessage);
      this.logger.log(`Message ${payload.messageId} edited by user ${user.userId}`);
    } catch (error) {
      this.logger.error('Failed to edit message', error);
      client.emit('editMessageError', { error: 'Could not edit message.' });
    }
  }
}

