import { Body, Controller, HttpStatus, Logger, Post, Req, HttpCode, UseGuards, Get, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import { JwtAuthGuard, GuardType } from 'src/common/guards/jwt-auth.guard'; 
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { Roles } from 'src/common/decorators/roles.decorator'; // Import Roles
import { common } from 'src/config/constant'; // Import common config
import { MedbotService } from './medbot.service';
import { ChatRequestDto } from './dto/chat-req.dto';

const GUARD = [common.patient, common.doctor, common.admin]; 

@Controller('v1/medbot')
export class MedbotController {
    private readonly controllerLogger = new Logger(MedbotController.name);
    
    constructor(private readonly medbotService: MedbotService) {}

    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
    @Get('history') // <-- Endpoint là /history
    @HttpCode(HttpStatus.OK)
    async getHistory(@Req() req): Promise<TApiReponse<any>> {
        // Kiểm tra xem req.user có tồn tại không
        if (!req.user || !req.user.userId) {
            throw new BadRequestException('User not found in request');
        }
        
        const userId = req.user.userId;
        const data = await this.medbotService.getChatHistory(userId);
        
        return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    }
    
    @GuardType(GUARD)
    @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard) 
    @Roles('patient', 'doctor', 'admin') 
    @Post('chat')
    @HttpCode(HttpStatus.OK)
    async chat(
        @Body(new ValidationPipe()) chatRequest: ChatRequestDto,
        @Req() req,
    ) : Promise<TApiReponse<any>> {

        console.log("Current User ID:", req.user.userId); 
        const userId = req.user.userId;
        const data = await this.medbotService.processUserMessage(chatRequest.prompt, userId);

        return ApiResponse.suscess(
            data,
            'Success', 
            HttpStatus.OK
        );
    }
    
}