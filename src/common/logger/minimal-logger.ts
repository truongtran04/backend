// src/common/logger/minimal-logger.ts
import { LoggerService, ConsoleLogger } from '@nestjs/common';

export class MinimalLogger extends ConsoleLogger implements LoggerService {
  log(message: string, context?: string) {
    const lower = message.toLowerCase();

    // Các pattern cần ẩn
    const hidePatterns = [
      'dependencies initialized', // module
      'controller {',             // controller
      'mapped {'                  // route
    ];

    if (hidePatterns.some(p => lower.includes(p))) {
      return; // ẩn log này
    }

    // Gọi lại log gốc của Nest để giữ format
    super.log(message, context);
  }

  // Các log khác giữ nguyên
  warn(message: string, context?: string) {
    super.warn(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
  }
}
