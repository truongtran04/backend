import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { ReviewHelpful } from "@prisma/client";

@Injectable()
export class ReviewHelpfulRepository extends BaseRepository<typeof PrismaService.prototype.reviewHelpful, ReviewHelpful> {
  constructor(
    private readonly prisma: PrismaService
  ) {
    super(prisma.reviewHelpful, 'id')
  }

  /**
   * Kiểm tra bệnh nhân đã vote cho bài nhận xét chưa
   */
  async hasPatientVoted(reviewId: string, patientId: string): Promise<boolean> {
    const vote = await this.prisma.reviewHelpful.findFirst({
      where: {
        review_id: reviewId,
        patient_id: patientId
      }
    });
    return !!vote;
  }

  /**
   * Lấy vote của bệnh nhân cho bài nhận xét
   */
  async getPatientVote(reviewId: string, patientId: string) {
    return await this.prisma.reviewHelpful.findFirst({
      where: {
        review_id: reviewId,
        patient_id: patientId
      }
    });
  }

  /**
   * Đếm số lượt "hữu ích" cho bài nhận xét
   */
  async countHelpful(reviewId: string): Promise<number> {
    return await this.prisma.reviewHelpful.count({
      where: {
        review_id: reviewId,
        is_helpful: true
      }
    });
  }

  /**
   * Đếm số lượt "không hữu ích" cho bài nhận xét
   */
  async countNotHelpful(reviewId: string): Promise<number> {
    return await this.prisma.reviewHelpful.count({
      where: {
        review_id: reviewId,
        is_helpful: false
      }
    });
  }

  /**
   * Cập nhật vote của bệnh nhân
   */
  async updateVote(reviewId: string, patientId: string, isHelpful: boolean) {
    return await this.prisma.reviewHelpful.update({
      where: {
        review_id_patient_id: {
          review_id: reviewId,
          patient_id: patientId
        }
      },
      data: { is_helpful: isHelpful }
    });
  }

  /**
   * Xóa vote
   */
  async deleteVote(reviewId: string, patientId: string) {
    return await this.prisma.reviewHelpful.delete({
      where: {
        review_id_patient_id: {
          review_id: reviewId,
          patient_id: patientId
        }
      }
    });
  }

  /**
   * Xóa tất cả vote cho bài nhận xét
   */
  async deleteAllVotesByReview(reviewId: string) {
    return await this.prisma.reviewHelpful.deleteMany({
      where: { review_id: reviewId }
    });
  }
}
