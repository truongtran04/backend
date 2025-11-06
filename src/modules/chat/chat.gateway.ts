import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { jwtConstants } from 'src/modules/auth/auth.constant';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = jwt.verify(token, jwtConstants.secret) as {
        sub: string;
        role: string;
        guard: string;
      };

      client.data.user = {
        userId: decoded.sub,
        role: decoded.role,
        guard: decoded.guard,
      };

      client.join(decoded.sub); // Tham gia vào phòng riêng của mình

      console.log('✅ Connected user:', client.data.user, ' and joined room: ', decoded.sub);
    } catch (err) {
      console.error('❌ Invalid token:', err.message);
      client.disconnect();
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(room);
    console.log(`User ${client.data.user.userId} joined room: ${room}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() payload: { recipientId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.user.userId;
    const { recipientId, content } = payload;

    const message = await this.chatService.createMessage(
      senderId,
      recipientId,
      content,
    );

    this.server.to(recipientId).emit('message', message);

    return message; // Gửi lại cho người gửi để xác nhận
  }
}
