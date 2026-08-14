ALTER TABLE "branches"
  ADD COLUMN "restaurant_type" TEXT,
  ADD COLUMN "setup_started_at" TIMESTAMP(3),
  ADD COLUMN "setup_completed_at" TIMESTAMP(3),
  ADD COLUMN "first_published_at" TIMESTAMP(3);
