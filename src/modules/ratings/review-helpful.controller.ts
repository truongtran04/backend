import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import { ValidationPipe } from 'src/pipes/validation.pipe';
import { BaseController } from 'src/common/bases/base.controller';
import { ReviewHelpful } from '@prisma/client';
import { ReviewHelpfulService } from './review-helpful.service';
import { ReviewHelpfulDTO } from './dto/review-helpful.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { common } from 'src/config/constant';

const GUARD = common.admin;

@Controller('v1/review-helpful')
export class ReviewHelpfulController extends BaseController<ReviewHelpful, 'id', ReviewHelpfulService> {
  private readonly controllerLogger = new Logger(ReviewHelpfulController.name);

  constructor(
    private readonly reviewHelpfulService: ReviewHelpfulService
  ) {
    super(reviewHelpfulService, 'id');
  }

  /**
   * Validate UUID format
   */
  private validateUUID(id: string, fieldName: string): void {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException(`${fieldName} không được để trống`);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`${fieldName} phải là UUID hợp lệ`);
    }
  }

  /**
   * Đánh dấu bài nhận xét là hữu ích hoặc không
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async voteReview(
    @Body(new ValidationPipe()) request: ReviewHelpfulDTO
  ): Promise<TApiReponse<any>> {
    const result = await this.reviewHelpfulService.voteReview(request);

    return ApiResponse.suscess(
      result,
      result ? 'Bình chọn thành công' : 'Hủy bình chọn thành công',
      HttpStatus.CREATED
    );
  }

  /**
   * Lấy vote của bệnh nhân cho bài nhận xét
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Get(':reviewId/:patientId')
  @HttpCode(HttpStatus.OK)
  async getPatientVote(
    @Param('reviewId') reviewId: string,
    @Param('patientId') patientId: string
  ): Promise<TApiReponse<any>> {
    // Validate parameters
    this.validateUUID(reviewId, 'Review ID');
    this.validateUUID(patientId, 'Patient ID');

    const vote = await this.reviewHelpfulService.getPatientVote(reviewId, patientId);

    return ApiResponse.suscess(
      vote,
      'Lấy bình chọn thành công',
      HttpStatus.OK
    );
  }

  /**
   * Kiểm tra bệnh nhân đã vote chưa
   * Note: Route must be before /stats to avoid routing conflicts
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Get('check/:reviewId/:patientId')
  @HttpCode(HttpStatus.OK)
  async checkPatientVoted(
    @Param('reviewId') reviewId: string,
    @Param('patientId') patientId: string
  ): Promise<TApiReponse<any>> {
    // Validate parameters
    this.validateUUID(reviewId, 'Review ID');
    this.validateUUID(patientId, 'Patient ID');

    const hasVoted = await this.reviewHelpfulService.hasPatientVoted(reviewId, patientId);

    return ApiResponse.suscess(
      { hasVoted },
      'Kiểm tra thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy thống kê "hữu ích" của bài nhận xét
   * Note: Route must be after named routes to avoid routing conflicts
   */
  @Get('stats/:reviewId')
  @HttpCode(HttpStatus.OK)
  async getReviewHelpfulStats(
    @Param('reviewId') reviewId: string
  ): Promise<TApiReponse<any>> {
    // Validate parameter
    this.validateUUID(reviewId, 'Review ID');

    const stats = await this.reviewHelpfulService.getReviewHelpfulStats(reviewId);

    return ApiResponse.suscess(
      stats,
      'Lấy thống kê thành công',
      HttpStatus.OK
    );
  }

  /**
   * Xóa vote
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Delete(':reviewId/:patientId')
  @HttpCode(HttpStatus.OK)
  async deleteVote(
    @Param('reviewId') reviewId: string,
    @Param('patientId') patientId: string
  ): Promise<TApiReponse<any>> {
    // Validate parameters
    this.validateUUID(reviewId, 'Review ID');
    this.validateUUID(patientId, 'Patient ID');

    await this.reviewHelpfulService.deleteVote(reviewId, patientId);

    return ApiResponse.message('Xóa bình chọn thành công', HttpStatus.OK);
  }
}
