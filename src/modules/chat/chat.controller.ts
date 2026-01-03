import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, UpdateMessageDto, FindOrCreateConversationDto } from './dto';
import { ValidationPipe } from 'src/pipes/validation.pipe';
import { ApiResponse, TApiReponse } from 'src/common/bases/api-reponse';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { common } from 'src/config/constant';
import { DoctorService } from '../doctors/doctor.service';
import { PatientService } from '../patients/patient.service';

const GUARD = common.admin;

@Controller('v1/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly doctorService: DoctorService,
    private readonly patientService: PatientService,
  ) { }

  /**
   * Tìm hoặc tạo conversation 
   * POST /v1/chat/conversations/find-or-create
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Post('/conversations/find-or-create')
  @HttpCode(HttpStatus.OK)
  async findOrCreateConversation(
    @Body(new ValidationPipe()) dto: FindOrCreateConversationDto,
    @Req() req,
  ): Promise<TApiReponse<any>> {
    try {
      const currentUserId = req.user.userId
      const currentRole = req.user.role;
      console.log(currentUserId, currentRole);
      
      let recipientUserId: string;

      if (currentRole === 'patient') {
        recipientUserId = await this.doctorService.getUserIdByDoctorId(dto.recipientId)
      }
      else if (currentRole === 'doctor') {
        recipientUserId = await this.patientService.getUserIdByPatientId(dto.recipientId);
      }
      else {
        throw new BadRequestException('Role không được hỗ trợ.');
      }

      const data = await this.chatService.findOrCreateConversation(
        currentUserId,
        recipientUserId,
      );

      return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error in findOrCreateConversation:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách conversations
   * GET /v1/chat/conversations
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Get('/conversations')
  @HttpCode(HttpStatus.OK)
  async getConversations(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req: any,
  ): Promise<TApiReponse<any[]>> {
    try {
      const userId = req.user?.userId;
      const data = await this.chatService.getUserConversations(
        userId,
        parseInt(limit),
        parseInt(offset),
      );

      return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error in getConversations:', error);
      throw error;
    }
  }

  /**
   * Lấy messages
   * GET /v1/chat/conversations/:id/messages
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Get('/messages/:id')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @Param('id') chatRoomId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Req() req: any,
  ): Promise<TApiReponse<any>> {
    try {
      const userId = req.user?.userId;
      const data = await this.chatService.getMessages(
        chatRoomId,
        userId,
        parseInt(page),
        parseInt(pageSize),
      );

      return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error in getMessages:', error);
      throw error;
    }
  }

  /**
   * Gửi message
   * POST /v1/chat/messages
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Post('/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body(new ValidationPipe()) dto: SendMessageDto,
    @Req() req: any,
  ): Promise<TApiReponse<any>> {
    try {
      const userId = req.user?.userId;
      const data = await this.chatService.sendMessage(dto, userId);

      return ApiResponse.suscess(data, 'Success', HttpStatus.CREATED);
    } catch (error) {
      this.logger.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Sửa/xóa message
   * PUT /v1/chat/messages/:id
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Put('/messages/:id')
  @HttpCode(HttpStatus.OK)
  async updateMessage(
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: UpdateMessageDto,
    @Req() req: any,
  ): Promise<TApiReponse<any>> {
    try {
      const userId = req.user?.userId;
      const data = await this.chatService.updateMessage(id, dto, userId);

      return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error in updateMessage:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu đã đọc
   * POST /v1/chat/conversations/:id/read
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor', 'patient')
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') chatRoomId: string,
    @Req() req: any,
  ): Promise<TApiReponse<any>> {
    try {
      const userId = req.user?.userId;
      const data = await this.chatService.markAsRead(chatRoomId, userId);

      return ApiResponse.suscess(data, 'Success', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error in markAsRead:', error);
      throw error;
    }
  }
}