/*
  Warnings:

  - The primary key for the `chat_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `chat_participants` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "chat_messages_chatRoomId_idx";

-- DropIndex
DROP INDEX "chat_messages_createdAt_idx";

-- DropIndex
DROP INDEX "chat_participants_userId_chatRoomId_key";

-- DropIndex
DROP INDEX "chat_participants_userId_idx";

-- AlterTable
ALTER TABLE "chat_participants" DROP CONSTRAINT "chat_participants_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("userId", "chatRoomId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_createdAt_idx" ON "chat_messages"("chatRoomId", "createdAt");
