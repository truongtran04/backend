-- CreateTable
CREATE TABLE "medbot_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "meta_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medbot_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medbot_histories_user_id_idx" ON "medbot_histories"("user_id");

-- CreateIndex
CREATE INDEX "medbot_histories_created_at_idx" ON "medbot_histories"("created_at");

-- AddForeignKey
ALTER TABLE "medbot_histories" ADD CONSTRAINT "medbot_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
