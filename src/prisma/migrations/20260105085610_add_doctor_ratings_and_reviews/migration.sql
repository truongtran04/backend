-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "average_rating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "total_reviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "doctor_ratings" (
    "rating_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "rating_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_ratings_pkey" PRIMARY KEY ("rating_id")
);

-- CreateTable
CREATE TABLE "doctor_reviews" (
    "review_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "rating_score" INTEGER NOT NULL,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "review_helpful" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "is_helpful" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_ratings_doctor_id_idx" ON "doctor_ratings"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_ratings_patient_id_idx" ON "doctor_ratings"("patient_id");

-- CreateIndex
CREATE INDEX "doctor_ratings_rating_score_idx" ON "doctor_ratings"("rating_score");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_ratings_doctor_id_patient_id_key" ON "doctor_ratings"("doctor_id", "patient_id");

-- CreateIndex
CREATE INDEX "doctor_reviews_doctor_id_idx" ON "doctor_reviews"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_reviews_patient_id_idx" ON "doctor_reviews"("patient_id");

-- CreateIndex
CREATE INDEX "doctor_reviews_rating_score_idx" ON "doctor_reviews"("rating_score");

-- CreateIndex
CREATE INDEX "doctor_reviews_status_idx" ON "doctor_reviews"("status");

-- CreateIndex
CREATE INDEX "doctor_reviews_created_at_idx" ON "doctor_reviews"("created_at");

-- CreateIndex
CREATE INDEX "doctor_reviews_helpful_count_idx" ON "doctor_reviews"("helpful_count");

-- CreateIndex
CREATE INDEX "review_helpful_review_id_idx" ON "review_helpful"("review_id");

-- CreateIndex
CREATE INDEX "review_helpful_patient_id_idx" ON "review_helpful"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_review_id_patient_id_key" ON "review_helpful"("review_id", "patient_id");

-- CreateIndex
CREATE INDEX "doctors_average_rating_idx" ON "doctors"("average_rating");

-- AddForeignKey
ALTER TABLE "doctor_ratings" ADD CONSTRAINT "doctor_ratings_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_ratings" ADD CONSTRAINT "doctor_ratings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;
