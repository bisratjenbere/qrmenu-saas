ALTER TABLE "service_requests" ADD COLUMN "guest_access_token" TEXT;
UPDATE "service_requests"
SET "guest_access_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "guest_access_token" IS NULL;
ALTER TABLE "service_requests" ALTER COLUMN "guest_access_token" SET NOT NULL;
CREATE UNIQUE INDEX "service_requests_guest_access_token_key" ON "service_requests"("guest_access_token");
