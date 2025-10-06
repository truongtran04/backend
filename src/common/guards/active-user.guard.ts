import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserService } from 'src/modules/users/user.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userFromToken = request.user;

    if (!userFromToken || !userFromToken.userId) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    // Lấy thông tin user mới nhất từ DB
    const user = await this.userService.findById(userFromToken.userId);
    
    if (!user) {
      throw new ForbiddenException('Người dùng không tồn tại');
    }

    if (!user.is_active) {
      throw new ForbiddenException('Tài khoản chưa được kích hoạt');
    }

    // Cập nhật request.user để các service/handler dùng
    // request.user = user;

    return true;
  }
}
