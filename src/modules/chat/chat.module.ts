// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [ChatGateway, ChatService, PrismaService], // Thêm PrismaService vào providers
  controllers: [ChatController],
})
export class ChatModule {}
