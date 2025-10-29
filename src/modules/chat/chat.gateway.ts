import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { jwtConstants } from 'src/modules/auth/auth.constant';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      // 🔹 Lấy token từ header hoặc handshake.auth
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // 🔹 Giải mã token (không cần verify DB ở đây)
      const decoded = jwt.verify(token, jwtConstants.secret) as {
        sub: string;
        role: string;
        guard: string;
      };

      // 🔹 Gán user vào socket (để dùng sau)
      client.data.user = {
        userId: decoded.sub,
        role: decoded.role,
        guard: decoded.guard,
      };

      console.log('✅ Connected user:', client.data.user);
    } catch (err) {
      console.error('❌ Invalid token:', err.message);
      client.disconnect();
    }
  }
}
