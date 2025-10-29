import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
