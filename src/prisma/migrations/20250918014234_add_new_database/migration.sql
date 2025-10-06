/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('patient', 'doctor', 'admin');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female', 'other');

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."patients" (
    "patient_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "identity_number" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "address" TEXT,
    "ethnicity" TEXT,
    "health_insurance_number" TEXT,
    "referral_code" TEXT,
    "occupation" TEXT,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "public"."specialties" (
    "specialty_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("specialty_id")
);

-- CreateTable
CREATE TABLE "public"."common_diseases" (
    "disease_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "disease_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_diseases_pkey" PRIMARY KEY ("disease_id")
);

-- CreateTable
CREATE TABLE "public"."doctors" (
    "doctor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "title" TEXT,
    "introduction" TEXT,
    "avatar_url" TEXT,
    "specializations" TEXT,
    "work_experience" TEXT,
    "achievements" TEXT,
    "experience_years" INTEGER,
    "consultation_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("doctor_id")
);

-- CreateTable
CREATE TABLE "public"."doctor_schedules" (
    "schedule_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "schedule_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "symptoms" TEXT,
    "notes" TEXT,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'pending',
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "public"."patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_identity_number_key" ON "public"."patients"("identity_number");

-- CreateIndex
CREATE INDEX "patients_phone_number_idx" ON "public"."patients"("phone_number");

-- CreateIndex
CREATE INDEX "patients_identity_number_idx" ON "public"."patients"("identity_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_key" ON "public"."specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "public"."doctors"("user_id");

-- CreateIndex
CREATE INDEX "doctors_specialty_id_idx" ON "public"."doctors"("specialty_id");

-- CreateIndex
CREATE INDEX "doctors_is_available_idx" ON "public"."doctors"("is_available");

-- CreateIndex
CREATE INDEX "doctor_schedules_doctor_id_schedule_date_idx" ON "public"."doctor_schedules"("doctor_id", "schedule_date");

-- CreateIndex
CREATE INDEX "doctor_schedules_schedule_date_is_available_idx" ON "public"."doctor_schedules"("schedule_date", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_doctor_id_schedule_date_start_time_key" ON "public"."doctor_schedules"("doctor_id", "schedule_date", "start_time");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "public"."appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_idx" ON "public"."appointments"("doctor_id");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_status_idx" ON "public"."appointments"("appointment_date", "status");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "public"."appointments"("status");

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."common_diseases" ADD CONSTRAINT "common_diseases_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("specialty_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctors" ADD CONSTRAINT "doctors_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("specialty_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("schedule_id") ON DELETE RESTRICT ON UPDATE CASCADE;
