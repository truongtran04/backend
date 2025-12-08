import { JwtAuthGuard } from './../../common/guards/jwt-auth.guard';
import { Controller, Get, UseGuards, Param, Sse, Query, ValidationPipe } from '@nestjs/common';
import { MediBotService } from './medibot.service'; 
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Observable } from 'rxjs';
import { SseMessage } from './medibot.service'; // Import SseMessage type
import { AskDto } from './ask.dto'; // Import AskDto

@Controller('medibot')
export class MediBotController {
  constructor(private readonly mediabotService: MediBotService) { }

  /**
   * Endpoint để lấy các chỉ số hiệu suất của MediBot. (Chỉ dành cho Admin)
   */
  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getMetrics() {
    return this.mediabotService.getMetrics();
  }

  @Sse(':conversationId/ask')
  askQuestionStream(
    @Param('conversationId') conversationId: string,
    @Query(new ValidationPipe({ transform: true })) askDto: AskDto, // Use AskDto for validation via query params
  ): Promise<Observable<SseMessage>> {
    return this.mediabotService.askQuestionStream(askDto.query, conversationId);
  }
}