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

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string): void {
    client.join(roomId);
    client.emit('joinedRoom', roomId); // Gửi lại xác nhận đã join phòng
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: { chatRoomId: string; senderId: string; content: string }): Promise<void> {
    try {
      const user = client['user']; // Lấy thông tin user đã được guard gắn vào
      const { chatRoomId, content } = payload;
      // Sử dụng ID từ token đã xác thực, không tin tưởng ID từ client gửi lên
      const message: ChatMessageWithSender = await this.chatService.createMessage(user.userId, chatRoomId, content);

      // Gửi tin nhắn tới tất cả client trong phòng
      this.server.to(chatRoomId).emit('receiveMessage', message);
    } catch (error) {
      this.logger.error('Failed to handle message', error);
      client.emit('messageError', 'Could not send message.');
    }
  }
}
