import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { Specialty } from "@prisma/client";


@Injectable()
export class SpecialtyRepository extends BaseRepository<
    typeof PrismaService.prototype.specialty,
    Specialty
>{
    constructor(
        private readonly prisma: PrismaService
    ){
        super(prisma.specialty, 'specialty_id')
    }
}