CREATE TYPE "ServiceRequestStatus" AS ENUM ('REQUESTED', 'ACKNOWLEDGED');

CREATE TABLE "service_requests" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "table_number" TEXT NOT NULL,
  "table_id" TEXT,
  "type" TEXT NOT NULL DEFAULT 'BILL',
  "status" "ServiceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged_at" TIMESTAMP(3),
  CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_requests_idempotency_key_key" ON "service_requests"("idempotency_key");
CREATE INDEX "service_requests_branch_id_status_created_at_idx" ON "service_requests"("branch_id", "status", "created_at");

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
