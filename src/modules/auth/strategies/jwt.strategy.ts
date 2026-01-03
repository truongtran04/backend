import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConstants } from "../auth.constant";
import { IJwtPayload } from "../auth.interface";
import { PrismaService } from "src/prisma/prisma.service";
import { UserService } from "src/modules/users/user.service";
import { IRequestWithGuardType } from "src/common/guards/jwt-auth.guard";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true
    });
  }

  async validate(request: IRequestWithGuardType, payload: IJwtPayload) {

    const allowedGuards = request.GuardType;
    if (allowedGuards) {
        if (Array.isArray(allowedGuards)) {
            if (!allowedGuards.includes(payload.guard)) {
                throw new UnauthorizedException("Bạn không có quyền truy cập chức năng này");
            }
        } else {
            if (allowedGuards !== payload.guard) {
                throw new UnauthorizedException("Bạn không có quyền truy cập chức năng này");
            }
        }
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request)
    
    const isBlackedList = await this.cacheManager.get(`blacklist:token:${token}`) as boolean | undefined
    if(isBlackedList){
        throw new UnauthorizedException("Token đã bị vô hiệu hóa")
    }

    const user = await this.userService.findById(payload.sub);
    if(!user) {
      throw new UnauthorizedException("Không tìm thấy bản ghi hợp lệ")
    }
    
    return { userId: payload.sub, guard: payload.guard, role: user.role };
  }
}