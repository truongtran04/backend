import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { User } from "@prisma/client";

@Injectable()
export class UserRepository extends BaseRepository<typeof PrismaService.prototype.user, User>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.user, 'user_id')
    }

    async isValidResetToken(otp: string): Promise<User | null> {
        return await this.model.findFirstOrThrow({
            where: {
                passwordResetOTP: otp,
                passwordResetOTPExpires: {
                    gt: new Date()
                }
            }
        })
    }

    async isValidActive(otp: string): Promise<User | null> {
        return await this.model.findFirstOrThrow({
            where: {
                passwordResetOTP: otp,
                passwordResetOTPExpires: {
                    gt: new Date()
                },
                is_active: false
            }
        });
    }
}