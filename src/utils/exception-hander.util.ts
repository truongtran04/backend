import { Logger } from "@nestjs/common";
import e from "express";

export class ExceptionHandler {
    static error(
        error: unknown,
        logger: Logger,
    ): never {
        const err = error as Error;
        logger.error(`Lỗi trong quá trình xử lý: ${err.message}`, err.stack);
        throw error
    }
}