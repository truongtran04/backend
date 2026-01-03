/*
  Warnings:

  - A unique constraint covering the columns `[lastMessageId]` on the table `chat_rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "chat_rooms_createdAt_idx";

-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "lastMessageId" TEXT;

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_senderId_createdAt_idx" ON "chat_messages"("chatRoomId", "senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_lastMessageId_key" ON "chat_rooms"("lastMessageId");

-- CreateIndex
CREATE INDEX "chat_rooms_lastMessageAt_idx" ON "chat_rooms"("lastMessageAt");

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
