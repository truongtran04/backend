/*
  Warnings:

  - You are about to drop the column `passwordResetToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetTokenExpires` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "passwordResetToken",
DROP COLUMN "passwordResetTokenExpires",
ADD COLUMN     "passwordResetOTP" TEXT,
ADD COLUMN     "passwordResetOTPExpires" TIMESTAMP(3);
