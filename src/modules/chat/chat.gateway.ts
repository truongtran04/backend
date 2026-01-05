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
import { forwardRef, Inject, Logger } from '@nestjs/common';
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

  constructor(
    @Inject(forwardRef(() => ChatService)) 
    private readonly chatService: ChatService
  ) {}

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
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string } | string, 
  ) {
    // Nếu frontend gửi string thì dùng luôn, nếu gửi object thì lấy chatRoomId
    const roomId = typeof data === 'string' ? data : data.chatRoomId;
    client.join(roomId);
    this.logger.log(`User ${client.data.userId} joined room ${roomId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string } | string,
  ) {
    const roomId = typeof data === 'string' ? data : data.chatRoomId;
    client.leave(roomId);
  }

  @SubscribeMessage('send_message')
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() dto: SendMessageDto,
) {
  const userId = client.data.userId;
  try {
    const message = await this.chatService.sendMessage(dto, userId);

    const roomId = String(dto.chatRoomId);
    
    // LOG ÄỂ DEBUG
    console.log('🚀 Broadcasting to room:', roomId);
    console.log('📦 Message data:', JSON.stringify(message, null, 2));
    console.log('👥 Rooms in server:', Array.from(this.server.sockets.adapter.rooms.keys()));
    
    // Emit tới toàn bộ room (kể cả người gửi)
    this.server.to(roomId).emit('receive_message', message);
    
    return { success: true, message };
  } catch (error) {
    this.logger.error(`❌ Error sending message: ${error.message}`);
    return { success: false, message: error.message };
  }
}

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomId: string; isTyping: boolean },
  ) {
    client.to(data.chatRoomId).emit('typing', {
      userId: client.data.userId,
      chatRoomId: data.chatRoomId,
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
  broadcastMessage(chatRoomId: string, message: any) {
    const roomId = String(chatRoomId);
    this.server.to(roomId).emit('receive_message', message);
  }
}