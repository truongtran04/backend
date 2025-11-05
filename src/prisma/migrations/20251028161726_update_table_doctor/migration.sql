/*
  Warnings:

  - You are about to drop the column `work_experience` on the `doctors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."doctors" DROP COLUMN "work_experience",
ADD COLUMN     "clinic_address" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "workplace" TEXT;
