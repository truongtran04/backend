import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { JobOptions } from "bull";

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name)

    constructor(
        @InjectQueue('emails') private readonly emailQueue: Queue,
        @InjectQueue('doctor-import') private readonly doctorQueue: Queue,
    ){

    }

    async addJob<T>(jobName: string, data: T, options: JobOptions | undefined){
        try {
            await this.emailQueue.add(jobName, data, options)
            this.logger.log(`Đã thêm công việc ${jobName} vào hàng đợi`)
        } catch (error) {
            this.logger.error(`Lỗi khi thêm công việc ${jobName} vào hàng đợi ${error instanceof Error ? error.message : 'Không xác định'}`)
            throw error
        }
    }

    async addDoctors<T>(jobName: string, data: T){
        try {
            await this.doctorQueue.add(jobName, data)
            this.logger.log(`Đã thêm job bác sĩ: ${jobName}`)
        } catch (error) {
            this.logger.error(`Lỗi khi thêm job bác sĩ: ${jobName}: ${error.message} : 'Không xác định'}`)
            throw error
        }
    }


}