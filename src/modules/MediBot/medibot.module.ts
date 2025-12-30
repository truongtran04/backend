import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediBotController } from './medibot.controller';
import { MediBotService } from './medibot.service';

@Module({
  imports: [ConfigModule], // Cần thiết vì MediBotService phụ thuộc vào ConfigService
  controllers: [MediBotController],
  providers: [MediBotService],
})
export class MediBotModule {}