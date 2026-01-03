/*
  Warnings:

  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatRoom` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('patient_doctor', 'doctor_doctor');

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_chatRoomId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_senderId_fkey";

-- DropForeignKey
ALTER TABLE "ChatParticipant" DROP CONSTRAINT "ChatParticipant_chatRoomId_fkey";

-- DropForeignKey
ALTER TABLE "ChatParticipant" DROP CONSTRAINT "ChatParticipant_userId_fkey";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "ChatParticipant";

-- DropTable
DROP TABLE "ChatRoom";

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'patient_doctor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "senderId" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_rooms_type_idx" ON "chat_rooms"("type");

-- CreateIndex
CREATE INDEX "chat_rooms_createdAt_idx" ON "chat_rooms"("createdAt");

-- CreateIndex
CREATE INDEX "chat_participants_chatRoomId_idx" ON "chat_participants"("chatRoomId");

-- CreateIndex
CREATE INDEX "chat_participants_userId_idx" ON "chat_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_userId_chatRoomId_key" ON "chat_participants"("userId", "chatRoomId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_idx" ON "chat_messages"("chatRoomId");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
