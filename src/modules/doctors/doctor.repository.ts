import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { Doctor } from "@prisma/client"

@Injectable()
export class DoctorRepository extends BaseRepository<typeof PrismaService.prototype.doctor, Doctor>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.doctor, 'doctor_id')
    }

    async countDoctors(): Promise<number> {
        return await this.prisma.doctor.count({
            where: {
                is_available: true,
            },
        });
    }
}
