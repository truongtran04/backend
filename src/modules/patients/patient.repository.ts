import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { Patient } from "@prisma/client"

@Injectable()
export class PatientRepository extends BaseRepository<typeof PrismaService.prototype.patient, Patient>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.patient, 'patient_id')
    }
    
}