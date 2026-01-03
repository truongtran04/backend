import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';

const userSockets = new Map<string, string>();

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      userSockets.set(userId, client.id);
      client.data.userId = userId;
      this.logger.log(`User ${userId} mapped to socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    const userId = client.data.userId;
    if (userId) {
      userSockets.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string },
  ) {
    const userId = client.data.userId;
    
    try {
      // Join room
      client.join(data.chatRoomId);
      this.logger.log(`User ${userId} joined room ${data.chatRoomId}`);
      
      return { success: true, message: 'Joined room successfully' };
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string },
  ) {
    client.leave(data.chatRoomId);
    this.logger.log(`User ${client.data.userId} left room ${data.chatRoomId}`);
    return { success: true, message: 'Left room successfully' };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.chatService.sendMessage(dto, userId);

      // Emit tin nhắn đến tất cả người trong phòng
      this.server.to(dto.chatRoomId).emit('new_message', message);

      this.logger.log(`Message sent in room ${dto.chatRoomId}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    
    client.to(data.chatRoomId).emit('user_typing', {
      userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.chatService.markAsRead(data.chatRoomId, userId);

      client.to(data.chatRoomId).emit('message_read', {
        userId,
        chatRoomId: data.chatRoomId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}