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
  NotFoundException
} from '@nestjs/common';
import { ApiResponse } from 'src/common/bases/api-reponse';
import type { TApiReponse } from 'src/common/bases/api-reponse';
import { ValidationPipe } from 'src/pipes/validation.pipe';
import { BaseController } from 'src/common/bases/base.controller';
import { DataTransformer } from 'src/common/bases/data.transform';
import { DoctorRating } from '@prisma/client';
import { RatingService } from './rating.service';
import { DoctorRatingDTO } from './dto/rating.dto';
import { CreateDoctorRatingDTO } from './dto/create-rating.dto';
import { UpdateDoctorRatingDTO } from './dto/update-rating.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GuardType } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { common } from 'src/config/constant';

const GUARD = common.admin;
@Controller('v1/ratings')
export class RatingController extends BaseController<DoctorRating, 'rating_id', RatingService> {
  private readonly controllerLogger = new Logger(RatingController.name);

  constructor(
    private readonly ratingService: RatingService,
    private readonly transformer: DataTransformer<DoctorRating, DoctorRatingDTO>
  ) {
    super(ratingService, 'rating_id');
  }

  /**
   * Tạo hoặc cập nhật đánh giá
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRating(
    @Body(new ValidationPipe()) createRequest: CreateDoctorRatingDTO
  ): Promise<TApiReponse<DoctorRatingDTO>> {
    const data = await this.ratingService.createOrUpdateRating(createRequest);

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorRatingDTO),
      'Đánh giá thành công',
      HttpStatus.CREATED
    );
  }

  /**
   * Lấy tất cả đánh giá của bác sĩ
   */
  @Get('/doctor/:doctorId')
  @HttpCode(HttpStatus.OK)
  async getRatingsByDoctor(
    @Param('doctorId') doctorId: string
  ): Promise<TApiReponse<DoctorRatingDTO[]>> {
    const data = await this.ratingService.getRatingsByDoctor(doctorId);

    return ApiResponse.suscess(
      this.transformer.transformArray(data, DoctorRatingDTO),
      'Lấy danh sách đánh giá thành công',
      HttpStatus.OK
    );
  }

  /**
   * Lấy thống kê đánh giá của bác sĩ
   */
  @Get('/doctor/:doctorId/stats')
  @HttpCode(HttpStatus.OK)
  async getDoctorRatingStats(
    @Param('doctorId') doctorId: string
  ): Promise<TApiReponse<any>> {
    const stats = await this.ratingService.getDoctorRatingStats(doctorId);

    return ApiResponse.suscess(
      stats,
      'Lấy thống kê đánh giá thành công',
      HttpStatus.OK
    );
  }

  /**
   * Kiểm tra bệnh nhân đã đánh giá bác sĩ chưa
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Get('/check/:doctorId/:patientId')
  @HttpCode(HttpStatus.OK)
  async checkPatientRating(
    @Param('doctorId') doctorId: string,
    @Param('patientId') patientId: string
  ): Promise<TApiReponse<any>> {
    const hasRated = await this.ratingService.hasPatientRated(doctorId, patientId);

    return ApiResponse.suscess(
      { hasRated },
      'Kiểm tra thành công',
      HttpStatus.OK
    );
  }

  /**
   * Cập nhật đánh giá
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateRating(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateRequest: UpdateDoctorRatingDTO
  ): Promise<TApiReponse<DoctorRatingDTO>> {
    const data = await this.ratingService.save(updateRequest, id);

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorRatingDTO),
      'Cập nhật đánh giá thành công',
      HttpStatus.OK
    );
  }

  /**
   * Xóa đánh giá
   */
  @GuardType(GUARD)
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles('patient')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteRating(
    @Param('id') id: string
  ): Promise<TApiReponse<any>> {
    await this.ratingService.deleteRating(id);

    return ApiResponse.message('Xóa đánh giá thành công', HttpStatus.OK);
  }

  /**
   * Lấy đánh giá theo ID
   */
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getRatingById(
    @Param('id') id: string
  ): Promise<TApiReponse<DoctorRatingDTO>> {
    const data = await this.ratingService.findById(id);

    if (!data) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return ApiResponse.suscess(
      this.transformer.transformSingle(data, DoctorRatingDTO),
      'Lấy đánh giá thành công',
      HttpStatus.OK
    );
  }
}
