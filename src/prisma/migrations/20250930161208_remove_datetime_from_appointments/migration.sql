/*
  Warnings:

  - You are about to drop the column `appointment_date` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `appointments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."appointments_appointment_date_status_idx";

-- AlterTable
ALTER TABLE "public"."appointments" DROP COLUMN "appointment_date",
DROP COLUMN "end_time",
DROP COLUMN "start_time";
