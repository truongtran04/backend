import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { BaseService } from "src/common/bases/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ReviewHelpful } from "@prisma/client";
import { ReviewHelpfulRepository } from "./review-helpful.repository";
import { ReviewHelpfulDTO } from "./dto/review-helpful.dto";
import { ReviewRepository } from "./review.repository";

@Injectable()
export class ReviewHelpfulService extends BaseService<ReviewHelpfulRepository, ReviewHelpful> {
  private readonly reviewHelpfulLogger = new Logger(ReviewHelpfulService.name);

  constructor(
    private readonly reviewHelpfulRepository: ReviewHelpfulRepository,
    protected readonly prismaService: PrismaService,
    private readonly reviewRepository: ReviewRepository
  ) {
    super(
      reviewHelpfulRepository,
      prismaService
    )
  }

  /**
   * Validate input parameters
   */
  private validateVoteInput(request: ReviewHelpfulDTO): void {
    if (!request.review_id || typeof request.review_id !== 'string') {
      throw new BadRequestException('Review ID là bắt buộc và phải là chuỗi');
    }

    if (!request.patient_id || typeof request.patient_id !== 'string') {
      throw new BadRequestException('Patient ID là bắt buộc và phải là chuỗi');
    }

    if (typeof request.is_helpful !== 'boolean') {
      throw new BadRequestException('is_helpful phải là giá trị boolean');
    }
  }

  /**
   * Validate review exists and is accessible
   */
  private async validateReviewExists(reviewId: string): Promise<void> {
    if (!reviewId || reviewId.trim().length === 0) {
      throw new BadRequestException('Review ID không được để trống');
    }

    const review = await this.prismaService.doctorReview.findFirst({
      where: { review_id: reviewId }
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy bài nhận xét với ID này');
    }
  }

  /**
   * Đánh dấu bài nhận xét là hữu ích hoặc không
   * Uses transaction to ensure atomic operations for concurrent vote updates
   */
  async voteReview(request: ReviewHelpfulDTO): Promise<ReviewHelpful> {
    // Validate input
    this.validateVoteInput(request);

    // Kiểm tra bài nhận xét tồn tại
    await this.validateReviewExists(request.review_id);

    // Use transaction to ensure data consistency when updating vote and helpful_count
    return await this.prismaService.$transaction(async (tx) => {
      // Kiểm tra bệnh nhân đã vote chưa
      const existingVote = await tx.reviewHelpful.findFirst({
        where: {
          review_id: request.review_id,
          patient_id: request.patient_id
        }
      });

      let vote: ReviewHelpful;

      if (existingVote) {
        // Cập nhật vote cũ
        if (existingVote.is_helpful === request.is_helpful) {
          // Nếu vote giống, xóa vote (toggle OFF)
          await tx.reviewHelpful.delete({
            where: { id: existingVote.id }
          });
          
          // Giảm helpful_count
          const increment = request.is_helpful ? -1 : 1;
          await tx.doctorReview.update({
            where: { review_id: request.review_id },
            data: { helpful_count: { increment } }
          });
          
          this.reviewHelpfulLogger.debug(`Removed vote for review ${request.review_id} by patient ${request.patient_id}`);
          return existingVote;
        } else {
          // Cập nhật vote khác
          vote = await tx.reviewHelpful.update({
            where: { id: existingVote.id },
            data: { is_helpful: request.is_helpful }
          });
          this.reviewHelpfulLogger.debug(`Updated vote for review ${request.review_id} by patient ${request.patient_id}`);
        }
      } else {
        // Tạo vote mới
        vote = await tx.reviewHelpful.create({
          data: {
            review_id: request.review_id,
            patient_id: request.patient_id,
            is_helpful: request.is_helpful
          }
        });
        this.reviewHelpfulLogger.debug(`Created new vote for review ${request.review_id} by patient ${request.patient_id}`);
      }

      // Cập nhật helpful_count dựa trên trạng thái vote hiện tại
      const increment = request.is_helpful ? 1 : -1;
      await tx.doctorReview.update({
        where: { review_id: request.review_id },
        data: { helpful_count: { increment } }
      });

      return vote;
    });
  }

  /**
   * Lấy vote của bệnh nhân cho bài nhận xét
   */
  async getPatientVote(reviewId: string, patientId: string) {
    if (!reviewId || reviewId.trim().length === 0) {
      throw new BadRequestException('Review ID không được để trống');
    }

    if (!patientId || patientId.trim().length === 0) {
      throw new BadRequestException('Patient ID không được để trống');
    }

    return await this.reviewHelpfulRepository.getPatientVote(reviewId, patientId);
  }

  /**
   * Lấy thống kê "hữu ích" của bài nhận xét
   */
  async getReviewHelpfulStats(reviewId: string) {
    if (!reviewId || reviewId.trim().length === 0) {
      throw new BadRequestException('Review ID không được để trống');
    }

    await this.validateReviewExists(reviewId);

    const [helpful, notHelpful] = await Promise.all([
      this.reviewHelpfulRepository.countHelpful(reviewId),
      this.reviewHelpfulRepository.countNotHelpful(reviewId)
    ]);

    return {
      helpful,
      notHelpful,
      total: helpful + notHelpful
    };
  }

  /**
   * Kiểm tra bệnh nhân đã vote chưa
   */
  async hasPatientVoted(reviewId: string, patientId: string): Promise<boolean> {
    if (!reviewId || reviewId.trim().length === 0) {
      throw new BadRequestException('Review ID không được để trống');
    }

    if (!patientId || patientId.trim().length === 0) {
      throw new BadRequestException('Patient ID không được để trống');
    }

    return await this.reviewHelpfulRepository.hasPatientVoted(reviewId, patientId);
  }

  /**
   * Xóa vote with transaction safety
   */
  async deleteVote(reviewId: string, patientId: string): Promise<void> {
    if (!reviewId || reviewId.trim().length === 0) {
      throw new BadRequestException('Review ID không được để trống');
    }

    if (!patientId || patientId.trim().length === 0) {
      throw new BadRequestException('Patient ID không được để trống');
    }

    await this.prismaService.$transaction(async (tx) => {
      const vote = await tx.reviewHelpful.findFirst({
        where: {
          review_id: reviewId,
          patient_id: patientId
        }
      });

      if (!vote) {
        throw new NotFoundException('Không tìm thấy vote của bệnh nhân cho bài nhận xét này');
      }

      await tx.reviewHelpful.delete({
        where: { id: vote.id }
      });

      // Giảm helpful_count dựa trên giá trị cũ của vote
      const increment = vote.is_helpful ? -1 : 1;
      await tx.doctorReview.update({
        where: { review_id: reviewId },
        data: { helpful_count: { increment } }
      });

      this.reviewHelpfulLogger.debug(`Deleted vote for review ${reviewId} by patient ${patientId}`);
    });
  }
}
