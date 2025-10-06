import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { DoctorSchedule } from "@prisma/client";


@Injectable()
export class ScheduleRepository extends BaseRepository<
    typeof PrismaService.prototype.doctorSchedule,
    DoctorSchedule
>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.doctorSchedule, 'schedule_id')
    }
}