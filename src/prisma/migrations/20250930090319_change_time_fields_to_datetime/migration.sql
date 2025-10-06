/*
  Warnings:

  - Changed the type of `start_time` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `end_time` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `start_time` on the `doctor_schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `end_time` on the `doctor_schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."appointments" ALTER COLUMN "appointment_date" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "start_time",
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
DROP COLUMN "end_time",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."doctor_schedules" ALTER COLUMN "schedule_date" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "start_time",
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
DROP COLUMN "end_time",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_doctor_id_schedule_date_start_time_key" ON "public"."doctor_schedules"("doctor_id", "schedule_date", "start_time");
