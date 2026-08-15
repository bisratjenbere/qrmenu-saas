ALTER TABLE "orders" ADD COLUMN "guest_access_token" TEXT;
UPDATE "orders"
SET "guest_access_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "guest_access_token" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "guest_access_token" SET NOT NULL;
CREATE UNIQUE INDEX "orders_guest_access_token_key" ON "orders"("guest_access_token");
