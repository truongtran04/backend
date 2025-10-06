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

    async isValidResetToken(token: string): Promise<User | null> {
        return await this.model.findFirstOrThrow({
            where: {
                passwordResetToken: token,
                passwordResetTokenExpires: {
                    gt: new Date()
                }
            }
        })
    }

    async isValidActive(token: string): Promise<User | null> {
        return await this.model.findFirstOrThrow({
            where: {
                passwordResetToken: token,
                passwordResetTokenExpires: {
                    gt: new Date()
                },
                is_active: false
            }
        });
    }
}