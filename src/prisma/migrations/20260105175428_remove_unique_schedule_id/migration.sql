/*
  Warnings:

  - You are about to drop the column `is_anonymous` on the `doctor_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `doctor_reviews` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "appointments_schedule_id_key";

-- DropIndex
DROP INDEX "doctor_reviews_status_idx";

-- AlterTable
ALTER TABLE "doctor_reviews" DROP COLUMN "is_anonymous",
DROP COLUMN "status",
ADD COLUMN     "doctor_reply" TEXT,
ADD COLUMN     "reply_at" TIMESTAMP(3);
