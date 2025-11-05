import { Process, Processor } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { DoctorService } from "./doctor.service";
import { CreateDoctorWithoutEmailDTO } from "./dto/create-doctor.dto";


@Processor('doctor-import')
export class DoctorProcessor {
    private readonly logger = new Logger(DoctorProcessor.name)

    constructor(
        private readonly doctorService: DoctorService
    ){}

    @Process('create-many-doctors')
    async handleCreateDoctors(job: Job<{request: CreateDoctorWithoutEmailDTO[]}>): Promise<void>{
        this.logger.log(`Bắt đầu xử lý job import bác sĩ (${job.id})...`)
        try {
            const { request } = job.data;
            const results = await this.doctorService.createManyDoctors(request);
            this.logger.log(`Đã import ${results.length} bác sĩ thành công!`);
        } catch (error) {
            this.logger.error(`Lỗi khi import bác sĩ: ${error instanceof Error ? error.message : error}`);
            throw error;
        }
    }
}