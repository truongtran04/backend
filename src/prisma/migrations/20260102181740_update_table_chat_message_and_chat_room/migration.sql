/*
  Warnings:

  - You are about to drop the column `lastMessageId` on the `chat_rooms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_lastMessageId_fkey";

-- DropIndex
DROP INDEX "chat_rooms_lastMessageId_key";

-- AlterTable
ALTER TABLE "chat_rooms" DROP COLUMN "lastMessageId";
