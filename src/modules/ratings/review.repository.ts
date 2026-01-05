import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { DoctorReview } from "@prisma/client";

@Injectable()
export class ReviewRepository extends BaseRepository<typeof PrismaService.prototype.doctorReview, DoctorReview> {
  constructor(
    private readonly prisma: PrismaService
  ) {
    super(prisma.doctorReview, 'review_id')
  }

  /**
   * Lấy tất cả bài nhận xét của bác sĩ
   */
  async getReviewsByDoctorId(doctorId: string) {
    return await this.prisma.doctorReview.findMany({
      where: { doctor_id: doctorId },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Lấy tất cả bài nhận xét của bác sĩ (với phân trang)
   * Bao gồm thông tin bệnh nhân để hiển thị
   */
  async getApprovedReviewsByDoctorId(doctorId: string, skip: number = 0, take: number = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.doctorReview.findMany({
        where: {
          doctor_id: doctorId
        },
        skip,
        take,
        include: {
          Patient: {
            select: {
              patient_id: true,
              full_name: true,
            }
          }
        },
        orderBy: [
          { helpful_count: 'desc' },
          { created_at: 'desc' }
        ]
      }),
      this.prisma.doctorReview.count({
        where: {
          doctor_id: doctorId
        }
      })
    ]);

    // Debug log
    console.log(`[ReviewRepository] Query for doctor ${doctorId}: Found ${total} total reviews, returning ${reviews.length} reviews`);
    if (reviews.length > 0) {
      console.log(`[ReviewRepository] Sample review IDs:`, reviews.slice(0, 3).map(r => r.review_id));
    }

    return { reviews, total };
  }

  /**
   * Lấy bài nhận xét của bệnh nhân
   */
  async getReviewByPatient(patientId: string, doctorId?: string) {
    const where: any = { patient_id: patientId };
    if (doctorId) {
      where.doctor_id = doctorId;
    }
    return await this.prisma.doctorReview.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Kiểm tra bệnh nhân đã nhận xét bác sĩ chưa
   */
  async hasPatientReviewedDoctor(patientId: string, doctorId: string): Promise<boolean> {
    const review = await this.prisma.doctorReview.findFirst({
      where: {
        patient_id: patientId,
        doctor_id: doctorId
      }
    });
    return !!review;
  }

  /**
   * Cập nhật số lượt "hữu ích" cho bài nhận xét
   */
  async updateHelpfulCount(reviewId: string, increment: number) {
    return await this.prisma.doctorReview.update({
      where: { review_id: reviewId },
      data: {
        helpful_count: { increment }
      }
    });
  }

  /**
   * Lấy bài nhận xét chờ duyệt
   */
  async getPendingReviews(skip: number = 0, take: number = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.doctorReview.findMany({
        skip,
        take,
        orderBy: { created_at: 'asc' }
      }),
      this.prisma.doctorReview.count({})
    ]);

    return { reviews, total };
  }

  /**
   * Cập nhật trạng thái bài nhận xét
   */
  async updateReviewStatus(reviewId: string, status: string) {
    return await this.prisma.doctorReview.update({
      where: { review_id: reviewId },
      data: {}
    });
  }

  /**
   * Đếm số lượt nhận xét của bác sĩ
   */
  async countReviewsByDoctor(doctorId: string): Promise<number> {
    return await this.prisma.doctorReview.count({
      where: { doctor_id: doctorId }
    });
  }

  /**
   * Lấy các bài nhận xét được đánh giá hữu ích nhất
   */
  async getMostHelpfulReviews(doctorId: string, limit: number = 5) {
    return await this.prisma.doctorReview.findMany({
      where: {
        doctor_id: doctorId
      },
      take: limit,
      orderBy: { helpful_count: 'desc' }
    });
  }

  /**
   * Xóa bài nhận xét
   */
  async deleteReview(reviewId: string) {
    return await this.prisma.doctorReview.delete({
      where: { review_id: reviewId }
    });
  }

  /**
   * Tìm kiếm bài nhận xét theo từ khóa
   */
  async searchReviews(doctorId: string, keyword: string) {
    return await this.prisma.doctorReview.findMany({
      where: {
        doctor_id: doctorId,
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
