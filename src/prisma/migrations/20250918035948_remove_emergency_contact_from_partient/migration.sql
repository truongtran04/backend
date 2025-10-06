/*
  Warnings:

  - You are about to drop the column `emergency_contact_name` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_phone` on the `patients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."patients" DROP COLUMN "emergency_contact_name",
DROP COLUMN "emergency_contact_phone";
