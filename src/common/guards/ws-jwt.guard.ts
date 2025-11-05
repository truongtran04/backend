import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { IAuthUser } from 'src/modules/auth/auth.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private logger: Logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromCookie(client);

    if (!token) {
      this.logger.warn('WS connection rejected: No token provided.');
      return false;
    }

    try {
      const payload: IAuthUser = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      // Gắn thông tin user vào socket để sử dụng ở các bước sau
      client['user'] = { userId: payload.userId, role: payload.role, guard: payload.guard };
    } catch (e) {
      this.logger.error('WS connection rejected: Invalid token.', e.message);
      return false;
    }
    return true;
  }

  private extractTokenFromCookie(client: Socket): string | null {
    const cookies = client.handshake.headers.cookie;
    if (!cookies) return null;
    const match = cookies.match(/accessToken=([^;]+)/);
    return match ? match[1] : null;
  }
}
