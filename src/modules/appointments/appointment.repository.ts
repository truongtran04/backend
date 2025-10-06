import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { Appointment } from "@prisma/client";

@Injectable()
export class AppointmentRepository extends BaseRepository<typeof PrismaService.prototype.appointment, Appointment>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.appointment, 'appointment_id')
    }
}