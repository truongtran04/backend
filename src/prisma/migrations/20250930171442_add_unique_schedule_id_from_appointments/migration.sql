/*
  Warnings:

  - A unique constraint covering the columns `[schedule_id]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "appointments_schedule_id_key" ON "public"."appointments"("schedule_id");
