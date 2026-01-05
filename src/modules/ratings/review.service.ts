import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { DoctorReview } from "@prisma/client";
import { ReviewRepository } from "./review.repository";
import { CreateDoctorReviewDTO } from "./dto/create-review.dto";
import { UpdateDoctorReviewDTO } from "./dto/update-review.dto";
import { SpecificationBuilder } from "src/classes/specification-builder.class";
import { DoctorService } from "../doctors/doctor.service";
import { PatientService } from "../patients/patient.service";
import { ReviewHelpfulRepository } from "./review-helpful.repository";
import { RatingRepository } from "./rating.repository";

@Injectable()
export class ReviewService extends BaseService<ReviewRepository, DoctorReview> {
  private readonly reviewLogger = new Logger(ReviewService.name);

  constructor(
    private readonly reviewRepository: ReviewRepository,
    protected readonly prismaService: PrismaService,
    private readonly doctorService: DoctorService,
    private readonly patientService: PatientService,
    private readonly reviewHelpfulRepository: ReviewHelpfulRepository,
    private readonly ratingRepository: RatingRepository,
  ) {
    super(
      reviewRepository,
      prismaService,
      new SpecificationBuilder({
        defaultSort: 'created_at, desc',
        simpleFilter: ['doctor_id', 'patient_id'],
        dateFilter: ['created_at', 'updated_at'],
        fieldTypes: {
          doctor_id: 'string',
          patient_id: 'string'
        }
      })
    )
  }

  protected async beforeSave(id?: string, payload?: CreateDoctorReviewDTO | UpdateDoctorReviewDTO): Promise<this> {
    if (!payload) {
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }
    return Promise.resolve(this);
  }

  /**
   * Tạo bài nhận xét mới với transaction safety
   */
  async createReview(request: CreateDoctorReviewDTO): Promise<DoctorReview> {
    // Input validation
    if (!request.doctor_id || !request.patient_id) {
      throw new BadRequestException('doctor_id và patient_id là bắt buộc');
    }

    if (!request.content || request.content.trim().length < 10) {
      throw new BadRequestException('Nội dung đánh giá phải từ 10-2000 ký tự');
    }

    if (request.content.trim().length > 2000) {
      throw new BadRequestException('Nội dung đánh giá không được vượt quá 2000 ký tự');
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

    // Kiểm tra bệnh nhân đã nhận xét bác sĩ chưa
    const hasReviewed = await this.reviewRepository.hasPatientReviewedDoctor(
      request.patient_id,
      request.doctor_id
    );

    if (hasReviewed) {
      throw new BadRequestException('Bạn đã nhận xét bác sĩ này rồi. Vui lòng chỉnh sửa đánh giá trước đó thay vì tạo mới.');
    }

    // BẮT BUỘC: Kiểm tra bệnh nhân đã có appointment completed với bác sĩ
    const hasAppointment = await this.verifyPatientVisited(request.patient_id, request.doctor_id);
    
    if (!hasAppointment) {
      throw new BadRequestException('Bạn chỉ có thể đánh giá sau khi đã hoàn thành cuộc hẹn khám bệnh với bác sĩ này');
    }

    // Use transaction to ensure review creation and stats update are atomic
    return await this.prismaService.$transaction(async (tx) => {
      // Luôn lưu direct vì không cần duyệt
      const review = await tx.doctorReview.create({
        data: {
          doctor_id: request.doctor_id,
          patient_id: request.patient_id,
          title: request.title || `Đánh giá ${request.rating_score} sao`,
          content: request.content.trim(),
          rating_score: request.rating_score,
          is_verified: true
        }
      });

      // Đồng bộ rating: Tạo hoặc cập nhật rating tương ứng
      // Đảm bảo rating và review luôn đồng bộ
      try {
        const existingRating = await tx.doctorRating.findFirst({
          where: {
            doctor_id: request.doctor_id,
            patient_id: request.patient_id
          }
        });

        if (existingRating) {
          // Cập nhật rating nếu đã tồn tại
          await tx.doctorRating.update({
            where: { rating_id: existingRating.rating_id },
            data: { rating_score: request.rating_score }
          });
        } else {
          // Tạo rating mới nếu chưa có
          await tx.doctorRating.create({
            data: {
              doctor_id: request.doctor_id,
              patient_id: request.patient_id,
              rating_score: request.rating_score
            }
          });
        }
      } catch (error) {
        // Log nhưng không throw error vì review đã được tạo thành công
        this.reviewLogger.warn(`Không thể đồng bộ rating cho review ${review.review_id}:`, error);
      }

      // Cập nhật thống kê của bác sĩ bằng cách tính lại từ tất cả reviews
      const stats = await tx.doctorReview.aggregate({
        where: { doctor_id: request.doctor_id },
        _avg: { rating_score: true },
        _count: { review_id: true }
      });

      await tx.doctor.update({
        where: { doctor_id: request.doctor_id },
        data: {
          average_rating: stats._avg.rating_score || 0,
          total_reviews: stats._count.review_id || 0
        }
      });

      this.reviewLogger.debug(`Created review ${review.review_id} and updated doctor stats`);

      return review;
    });
  }

  /**
   * Xác nhận bệnh nhân đã từng khám với bác sĩ
   * Chỉ chấp nhận appointment có status 'completed'
   */
  private async verifyPatientVisited(patientId: string, doctorId: string): Promise<boolean> {
    const appointment = await this.prismaService.appointment.findFirst({
      where: {
        patient_id: patientId,
        doctor_id: doctorId,
        status: 'completed'
      }
    });
    return !!appointment;
  }

  /**
   * Cập nhật thống kê bài nhận xét của bác sĩ
   * Tính lại average_rating dựa trên reviews (vì reviews là nguồn chính)
   */
  private async updateDoctorReviewStats(doctorId: string): Promise<void> {
    try {
      // Đếm tất cả các review
      const totalReviews = await this.prismaService.doctorReview.count({
        where: {
          doctor_id: doctorId
        }
      });

      // Tính average_rating từ tất cả các review
      const avgResult = await this.prismaService.doctorReview.aggregate({
        where: {
          doctor_id: doctorId
        },
        _avg: {
          rating_score: true
        }
      });

      const averageRating = avgResult._avg?.rating_score || 0;

      await this.prismaService.doctor.update({
        where: { doctor_id: doctorId },
        data: {
          total_reviews: totalReviews,
          average_rating: averageRating
        }
      });
    } catch (error) {
      this.reviewLogger.error(`Lỗi cập nhật thống kê bài nhận xét cho bác sĩ ${doctorId}:`, error);
    }
  }

  /**
   * Lấy tất cả bài nhận xét của bác sĩ (phê duyệt)
   */
  async getReviewsByDoctor(doctorId: string, skip: number = 0, take: number = 10) {
    this.reviewLogger.log(`Getting reviews for doctor ${doctorId}, skip: ${skip}, take: ${take}`);
    const result = await this.reviewRepository.getApprovedReviewsByDoctorId(doctorId, skip, take);
    this.reviewLogger.log(`Found ${result.total} total reviews, returning ${result.reviews.length} reviews`);
    return result;
  }

  /**
   * Lấy bài nhận xét của bệnh nhân
   */
  async getReviewsByPatient(patientId: string) {
    return await this.reviewRepository.getReviewByPatient(patientId);
  }

  /**
   * Lấy bài nhận xét chờ duyệt (admin/moderator)
   */
  async getPendingReviews(skip: number = 0, take: number = 10) {
    return await this.reviewRepository.getPendingReviews(skip, take);
  }

  /**
   * Duyệt bài nhận xét
   */
  async approveReview(reviewId: string): Promise<DoctorReview> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    return review;
  }

  /**
   * Từ chối bài nhận xét
   */
  async rejectReview(reviewId: string): Promise<DoctorReview> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    return review;
  }

  /**
   * Cập nhật bài nhận xét
   */
  async updateReview(reviewId: string, patientId: string, request: UpdateDoctorReviewDTO): Promise<DoctorReview> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    // Chỉ bệnh nhân tác giả mới có thể sửa
    if (review.patient_id !== patientId) {
      throw new ForbiddenException('Bạn không có quyền sửa bài nhận xét này');
    }

    const updatedReview = await this.save(request, reviewId);

    // Đồng bộ rating nếu rating_score được cập nhật
    if (request.rating_score !== undefined && request.rating_score !== review.rating_score) {
      try {
        const existingRating = await this.ratingRepository.getRatingByDoctorAndPatient(
          review.doctor_id,
          review.patient_id
        );

        if (existingRating) {
          await this.prismaService.doctorRating.update({
            where: { rating_id: existingRating.rating_id },
            data: { rating_score: request.rating_score }
          });
        }
      } catch (error) {
        this.reviewLogger.warn(`Không thể đồng bộ rating khi cập nhật review ${reviewId}:`, error);
      }

      // Cập nhật thống kê vì rating_score đã thay đổi
      await this.updateDoctorReviewStats(review.doctor_id);
    }

    return updatedReview;
  }

  /**
   * Xóa bài nhận xét
   */
  async deleteReview(reviewId: string, patientId?: string): Promise<void> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    // Nếu có patientId, kiểm tra quyền
    if (patientId && review.patient_id !== patientId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài nhận xét này');
    }

    // Xóa tất cả vote cho bài nhận xét
    await this.reviewHelpfulRepository.deleteAllVotesByReview(reviewId);

    // Xóa bài nhận xét
    await this.destroy(reviewId);

    // Cập nhật thống kê
    await this.updateDoctorReviewStats(review.doctor_id);
  }

  /**
   * Tìm kiếm bài nhận xét
   */
  async searchReviews(doctorId: string, keyword: string) {
    return await this.reviewRepository.searchReviews(doctorId, keyword);
  }

  /**
   * Lấy bài nhận xét hữu ích nhất
   */
  async getMostHelpfulReviews(doctorId: string, limit: number = 5) {
    return await this.reviewRepository.getMostHelpfulReviews(doctorId, limit);
  }

  /**
   * Lấy chi tiết một bài nhận xét
   */
  async getReviewDetail(reviewId: string) {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    const [helpful, notHelpful] = await Promise.all([
      this.reviewHelpfulRepository.countHelpful(reviewId),
      this.reviewHelpfulRepository.countNotHelpful(reviewId)
    ]);

    return {
      ...review,
      helpful_count: helpful,
      unhelpful_count: notHelpful
    };
  }

  /**
   * Phản hồi bài nhận xét (Doctor)
   */
  async replyToReview(reviewId: string, userId: string, reply: string): Promise<DoctorReview> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét');
    }

    // Lấy thông tin doctor từ userId
    const doctor = await this.doctorService.findByField('user_id', userId);
    if (!doctor) {
      throw new ForbiddenException('Không tìm thấy thông tin bác sĩ');
    }

    // Kiểm tra quyền: chỉ bác sĩ của review mới được phản hồi
    if (review.doctor_id !== doctor.doctor_id) {
      throw new ForbiddenException('Bạn không có quyền phản hồi bài nhận xét này');
    }

    // Cập nhật phản hồi
    return await this.save({
      doctor_reply: reply,
      reply_at: new Date()
    }, reviewId);
  }
}
