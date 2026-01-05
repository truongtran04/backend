import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Query,
  Patch,
  NotFoundException,
  Req
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import { ValidationPipe } from 'src/pipes/validation.pipe';
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { DoctorReview } from '@prisma/client';
import { ReviewService } from './review.service';
import { DoctorReviewDTO } from './dto/review.dto';
import { CreateDoctorReviewDTO } from './dto/create-review.dto';
import { UpdateDoctorReviewDTO } from './dto/update-review.dto';
import { ReplyReviewDTO } from './dto/reply-review.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { common } from 'src/config/constant';

const GUARD = common.admin;

@Controller('v1/reviews')
export class ReviewController extends BaseController<DoctorReview, 'review_id', ReviewService> {
  private readonly controllerLogger = new Logger(ReviewController.name);

  constructor(
    private readonly reviewService: ReviewService,
    private readonly transformer: DataTransformer<DoctorReview, DoctorReviewDTO>
  ) {
    super(reviewService, 'review_id');
  }

  /**
   * Tạo bài nhận xét mới
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body(new ValidationPipe()) createRequest: CreateDoctorReviewDTO
  ): Promise<TApiReponse<DoctorReviewDTO>> {
    const data = await this.reviewService.createReview(createRequest);

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorReviewDTO),
      'Tạo bài nhận xét thành công',
      HttpStatus.CREATED
    );
  }

  /**
   * Lấy bài nhận xét chờ duyệt (admin/moderator)
   */
  @GuardType(common.admin)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('admin')
  @Get('pending/list')
  @HttpCode(HttpStatus.OK)
  async getPendingReviews(
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10
  ): Promise<TApiReponse<any>> {
    const result = await this.reviewService.getPendingReviews(skip, take);

    return ApiResponse.suscess(
      result,
      'Lấy danh sách bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Tìm kiếm bài nhận xét theo từ khóa
   */
  @Get('search/:doctorId')
  @HttpCode(HttpStatus.OK)
  async searchReviews(
    @Param('doctorId') doctorId: string,
    @Query('keyword') keyword: string
  ): Promise<TApiReponse<DoctorReviewDTO[]>> {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('Keyword không được để trống');
    }

    const data = await this.reviewService.searchReviews(doctorId, keyword.trim());

    return ApiResponse.suscess(
      this.transformer.transformArray(data, DoctorReviewDTO),
      'Tìm kiếm bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy bài nhận xét hữu ích nhất của bác sĩ
   */
  @Get('doctor/:doctorId/helpful')
  @HttpCode(HttpStatus.OK)
  async getMostHelpfulReviews(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit: number = 5
  ): Promise<TApiReponse<DoctorReviewDTO[]>> {
    const validLimit = Math.min(Math.max(limit, 1), 50); // Limit 1-50

    const data = await this.reviewService.getMostHelpfulReviews(doctorId, validLimit);

    return ApiResponse.suscess(
      this.transformer.transformArray(data, DoctorReviewDTO),
      'Lấy bài nhận xét hữu ích nhất thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy tất cả bài nhận xét của bác sĩ (với phân trang)
   */
  @Get('doctor/:doctorId')
  @HttpCode(HttpStatus.OK)
  async getReviewsByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10
  ): Promise<TApiReponse<any>> {
    const validSkip = Math.max(skip, 0);
    const validTake = Math.min(Math.max(take, 1), 100); // Limit 1-100

    const result = await this.reviewService.getReviewsByDoctor(doctorId, validSkip, validTake);

    return ApiResponse.suscess(
      result,
      'Lấy danh sách bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy bài nhận xét của bệnh nhân
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Get('patient/:patientId')
  @HttpCode(HttpStatus.OK)
  async getReviewsByPatient(
    @Param('patientId') patientId: string
  ): Promise<TApiReponse<DoctorReviewDTO[]>> {
    const data = await this.reviewService.getReviewsByPatient(patientId);

    return ApiResponse.suscess(
      this.transformer.transformArray(data, DoctorReviewDTO),
      'Lấy danh sách bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy chi tiết bài nhận xét với thống kê helpful/unhelpful
   */
  @Get(':id/detail')
  @HttpCode(HttpStatus.OK)
  async getReviewDetail(
    @Param('id') id: string
  ): Promise<TApiReponse<any>> {
    const data = await this.reviewService.getReviewDetail(id);

    return ApiResponse.suscess(
      data,
      'Lấy chi tiết bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Phản hồi bài nhận xét (Doctor)
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/reply')
  @HttpCode(HttpStatus.OK)
  async replyToReview(
    @Param('id') id: string,
    @Body(new ValidationPipe()) replyRequest: ReplyReviewDTO,
    @Req() request: Request
  ): Promise<TApiReponse<DoctorReviewDTO>> {
    const auth = (request.user as { userId: string });
    const data = await this.reviewService.replyToReview(id, auth.userId, replyRequest.reply);

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorReviewDTO),
      'Phản hồi thành công',
      HttpStatus.OK
    );
  }

  /**
   * Cập nhật bài nhận xét (chỉ tác giả có quyền)
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateReview(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateRequest: UpdateDoctorReviewDTO,
    @Req() request: Request
  ): Promise<TApiReponse<DoctorReviewDTO>> {
    // Lấy patient_id từ user context
    const userAuth = (request.user as { patientId?: string; userId?: string });
    const patientId = userAuth.patientId || userAuth.userId;

    if (!patientId) {
      throw new Error('Không thể xác định thông tin bệnh nhân');
    }

    const data = await this.reviewService.updateReview(id, patientId, updateRequest);

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorReviewDTO),
      'Cập nhật bài nhận xét thành công',
      HttpStatus.OK
    );
  }

  /**
   * Xóa bài nhận xét (chỉ tác giả có quyền)
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(
    @Param('id') id: string,
    @Req() request: Request
  ): Promise<TApiReponse<any>> {
    // Lấy patient_id từ user context
    const userAuth = (request.user as { patientId?: string; userId?: string });
    const patientId = userAuth.patientId || userAuth.userId;

    if (!patientId) {
      throw new Error('Không thể xác định thông tin bệnh nhân');
    }

    await this.reviewService.deleteReview(id, patientId);

    return ApiResponse.message('Xóa bài nhận xét thành công', HttpStatus.OK);
  }

  /**
   * Lấy bài nhận xét theo ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getReviewById(
    @Param('id') id: string
  ): Promise<TApiReponse<DoctorReviewDTO>> {
    const data = await this.reviewService.findById(id);

    if (!data) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorReviewDTO),
      'Lấy bài nhận xét thành công',
      HttpStatus.OK
    );
  }
}