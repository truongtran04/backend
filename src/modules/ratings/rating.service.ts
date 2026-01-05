import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { DoctorRating } from "@prisma/client";
import { RatingRepository } from "./rating.repository";
import { CreateDoctorRatingDTO } from "./dto/create-rating.dto";
import { UpdateDoctorRatingDTO } from "./dto/update-rating.dto";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { DoctorService } from "../doctors/doctor.service";
import { PatientService } from "../patients/patient.service";

@Injectable()
export class RatingService extends BaseService<RatingRepository, DoctorRating> {
  private readonly ratingLogger = new Logger(RatingService.name);

  constructor(
    private readonly ratingRepository: RatingRepository,
    protected readonly prismaService: PrismaService,
    private readonly doctorService: DoctorService,
    private readonly patientService: PatientService,
  ) {
    super(
      ratingRepository,
      prismaService,
      new SpecificationBuilder({
        defaultSort: 'created_at, desc',
        simpleFilter: ['doctor_id', 'patient_id'],
        dateFilter: ['created_at', 'updated_at'],
        fieldTypes: {
          doctor_id: 'string',
          patient_id: 'string',
          rating_score: 'number'
        }
      })
    )
  }

  protected async beforeSave(id?: string, payload?: CreateDoctorRatingDTO | UpdateDoctorRatingDTO): Promise<this> {
    if (!payload) {
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }
    return Promise.resolve(this);
  }

  /**
   * Tạo hoặc cập nhật đánh giá
   */
  async createOrUpdateRating(request: CreateDoctorRatingDTO): Promise<DoctorRating> {
    // Input validation
    if (!request.doctor_id || !request.patient_id) {
      throw new BadRequestException('doctor_id và patient_id là bắt buộc');
    }

    if (request.rating_score < 1 || request.rating_score > 5) {
      throw new BadRequestException('Điểm đánh giá phải từ 1-5');
    }

    // Kiểm tra bác sĩ tồn tại
    const doctor = await this.doctorService.findById(request.doctor_id);
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy bác sĩ');
    }

    // Kiểm tra bệnh nhân tồn tại
    const patient = await this.patientService.findById(request.patient_id);
    if (!patient) {
      throw new NotFoundException('Không tìm thấy bệnh nhân');
    }

    // BẮT BUỘC: Kiểm tra bệnh nhân đã có appointment COMPLETED với bác sĩ
    // Chỉ chấp nhận status 'completed', không chấp nhận 'confirmed'
    const hasAppointment = await this.prismaService.appointment.findFirst({
      where: {
        patient_id: request.patient_id,
        doctor_id: request.doctor_id,
        status: 'completed'
      }
    });

    if (!hasAppointment) {
      throw new BadRequestException('Bạn chỉ có thể đánh giá sau khi đã hoàn thành cuộc hẹn khám bệnh với bác sĩ này');
    }

    // Kiểm tra bệnh nhân đã đánh giá chưa
    const existingRating = await this.ratingRepository.getRatingByDoctorAndPatient(
      request.doctor_id,
      request.patient_id
    );

    let rating: DoctorRating;

    if (existingRating) {
      // Cập nhật đánh giá cũ
      rating = await this.save({
        rating_score: request.rating_score
      }, existingRating.rating_id);
    } else {
      // Tạo đánh giá mới
      rating = await this.save(request);
    }

    // Cập nhật điểm trung bình và số lượt đánh giá cho bác sĩ
    await this.updateDoctorRatingStats(request.doctor_id);

    return rating;
  }

  /**
   * Cập nhật thống kê đánh giá của bác sĩ
   * Lưu ý: average_rating và total_reviews nên được tính từ reviews (nguồn chính)
   * Rating service này chỉ cập nhật rating khi tạo rating độc lập (không kèm review)
   */
  private async updateDoctorRatingStats(doctorId: string): Promise<void> {
    try {
      // Tính average_rating từ reviews (nguồn chính cho display)
      const reviewsAvgResult = await this.prismaService.doctorReview.aggregate({
        where: {
          doctor_id: doctorId
        },
        _avg: {
          rating_score: true
        }
      });

      const averageRating = reviewsAvgResult._avg?.rating_score || 0;
      
      // total_reviews chỉ đếm từ reviews
      const totalReviews = await this.prismaService.doctorReview.count({
        where: {
          doctor_id: doctorId
        }
      });

      await this.prismaService.doctor.update({
        where: { doctor_id: doctorId },
        data: {
          average_rating: averageRating,
          total_reviews: totalReviews
        }
      });
    } catch (error) {
      this.ratingLogger.error(`Lỗi cập nhật thống kê đánh giá cho bác sĩ ${doctorId}:`, error);
    }
  }

  /**
   * Lấy tất cả đánh giá của bác sĩ
   */
  async getRatingsByDoctor(doctorId: string) {
    return await this.ratingRepository.getRatingsByDoctorId(doctorId);
  }

  /**
   * Lấy đánh giá trung bình và chi tiết của bác sĩ
   * Sử dụng reviews làm nguồn chính (vì reviews là nguồn đáng tin cậy hơn)
   */
  async getDoctorRatingStats(doctorId: string) {
    // Tính từ reviews (nguồn chính)
    const reviews = await this.prismaService.doctorReview.findMany({
      where: {
        doctor_id: doctorId,
      },
      select: { rating_score: true }
    });

    const totalRatings = reviews.length;
    const averageRating = totalRatings > 0
      ? reviews.reduce((sum, r) => sum + r.rating_score, 0) / totalRatings
      : 0;

    const breakdown = {
      fiveStar: reviews.filter(r => r.rating_score === 5).length,
      fourStar: reviews.filter(r => r.rating_score === 4).length,
      threeStar: reviews.filter(r => r.rating_score === 3).length,
      twoStar: reviews.filter(r => r.rating_score === 2).length,
      oneStar: reviews.filter(r => r.rating_score === 1).length,
    };

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings,
      ratingBreakdown: breakdown
    };
  }

  /**
   * Kiểm tra bệnh nhân đã đánh giá bác sĩ chưa
   */
  async hasPatientRated(doctorId: string, patientId: string): Promise<boolean> {
    const rating = await this.ratingRepository.getRatingByDoctorAndPatient(doctorId, patientId);
    return !!rating;
  }

  /**
   * Xóa đánh giá
   */
  async deleteRating(ratingId: string): Promise<void> {
    const rating = await this.findById(ratingId);
    if (!rating) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    await this.destroy(ratingId);

    // Cập nhật thống kê của bác sĩ
    await this.updateDoctorRatingStats(rating.doctor_id);
  }

  /**
   * Xóa đánh giá của bệnh nhân cho bác sĩ
   */
  async deleteRatingByDoctorAndPatient(doctorId: string, patientId: string): Promise<void> {
    await this.ratingRepository.deleteRatingByDoctorAndPatient(doctorId, patientId);
    await this.updateDoctorRatingStats(doctorId);
  }
}
