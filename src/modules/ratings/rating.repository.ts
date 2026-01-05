import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseRepository } from "src/repositories/base.repository";
import { DoctorRating } from "@prisma/client";

@Injectable()
export class RatingRepository extends BaseRepository<typeof PrismaService.prototype.doctorRating, DoctorRating> {
  constructor(
    private readonly prisma: PrismaService
  ) {
    super(prisma.doctorRating, 'rating_id')
  }

  /**
   * Lấy tất cả đánh giá của bác sĩ
   */
  async getRatingsByDoctorId(doctorId: string) {
    return await this.prisma.doctorRating.findMany({
      where: { doctor_id: doctorId },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Lấy đánh giá của bệnh nhân cho bác sĩ cụ thể
   */
  async getRatingByDoctorAndPatient(doctorId: string, patientId: string) {
    return await this.prisma.doctorRating.findFirst({
      where: {
        doctor_id: doctorId,
        patient_id: patientId
      }
    });
  }

  /**
   * Tính điểm đánh giá trung bình của bác sĩ
   */
  async getAverageRating(doctorId: string): Promise<number> {
    const result = await this.prisma.doctorRating.aggregate({
      where: { doctor_id: doctorId },
      _avg: { rating_score: true }
    });
    return result._avg?.rating_score || 0;
  }

  /**
   * Đếm số lượt đánh giá của bác sĩ
   */
  async countRatingsByDoctor(doctorId: string): Promise<number> {
    return await this.prisma.doctorRating.count({
      where: { doctor_id: doctorId }
    });
  }

  /**
   * Lấy thống kê chi tiết về đánh giá (5 sao, 4 sao, etc)
   */
  async getRatingBreakdown(doctorId: string) {
    const ratings = await this.prisma.doctorRating.findMany({
      where: { doctor_id: doctorId },
      select: { rating_score: true }
    });

    const breakdown = {
      fiveStar: ratings.filter(r => r.rating_score === 5).length,
      fourStar: ratings.filter(r => r.rating_score === 4).length,
      threeStar: ratings.filter(r => r.rating_score === 3).length,
      twoStar: ratings.filter(r => r.rating_score === 2).length,
      oneStar: ratings.filter(r => r.rating_score === 1).length,
    };

    return breakdown;
  }

  /**
   * Xóa đánh giá của bệnh nhân cho bác sĩ
   */
  async deleteRatingByDoctorAndPatient(doctorId: string, patientId: string) {
    return await this.prisma.doctorRating.deleteMany({
      where: {
        doctor_id: doctorId,
        patient_id: patientId
      }
    });
  }
}
