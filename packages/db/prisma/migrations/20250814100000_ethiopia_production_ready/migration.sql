-- Ethiopia-first production schema extension
-- Safe defaults preserve existing data; backfill service_mode from qr_mode.

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('MENU_ONLY', 'SINGLE_QR_SELF_ORDER', 'PER_TABLE_QR');
CREATE TYPE "TableInputMode" AS ENUM ('FREE_TEXT', 'VALIDATED');
CREATE TYPE "FulfillmentType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'ROOM_SERVICE');
CREATE TYPE "PrimaryLanguage" AS ENUM ('AM', 'EN');

-- AlterEnum: add ARCHIVED to MenuStatus
ALTER TYPE "MenuStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Branch extensions
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "service_mode" "ServiceMode" NOT NULL DEFAULT 'SINGLE_QR_SELF_ORDER';
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "primary_language" "PrimaryLanguage" NOT NULL DEFAULT 'AM';
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "table_input_mode" "TableInputMode" NOT NULL DEFAULT 'VALIDATED';
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "enable_takeaway" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "enable_room_service" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "call_waiter_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "request_bill_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "whatsapp_number" TEXT;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "setup_step" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "setup_draft_backup_json" TEXT;

UPDATE "branches"
SET "service_mode" = CASE
  WHEN "qr_mode" = 'PER_TABLE' THEN 'PER_TABLE_QR'::"ServiceMode"
  ELSE 'SINGLE_QR_SELF_ORDER'::"ServiceMode"
END
WHERE "service_mode" = 'SINGLE_QR_SELF_ORDER';

-- Table QR tokens
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "qr_token" TEXT;
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "qr_token_revoked_at" TIMESTAMP(3);

UPDATE "tables" SET "qr_token" = gen_random_uuid()::text WHERE "qr_token" IS NULL;
ALTER TABLE "tables" ALTER COLUMN "qr_token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tables_qr_token_key" ON "tables"("qr_token");

-- Menu versioning
ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

UPDATE "menus" SET "published_at" = "updated_at" WHERE "status" = 'PUBLISHED' AND "published_at" IS NULL;

CREATE INDEX IF NOT EXISTS "menus_branch_id_status_idx" ON "menus"("branch_id", "status");

-- MenuSection
ALTER TABLE "menu_sections" ADD COLUMN IF NOT EXISTS "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- MenuItem extensions
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "description_amharic" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "kitchen_description" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "unavailable_reason" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "unavailable_until" TIMESTAMP(3);

-- Modifier tables
CREATE TABLE IF NOT EXISTS "modifier_groups" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "modifier_options" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "price_delta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "modifier_groups" DROP CONSTRAINT IF EXISTS "modifier_groups_menu_item_id_fkey";
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_menu_item_id_fkey"
  FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "modifier_options" DROP CONSTRAINT IF EXISTS "modifier_options_group_id_fkey";
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order monetary snapshots
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillment_type" "FulfillmentType" NOT NULL DEFAULT 'DINE_IN';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "table_id" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ETB';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_charge_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_charge_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill order totals from line items for existing orders
UPDATE "orders" o
SET
  "subtotal" = COALESCE(agg.subtotal, 0),
  "grand_total" = COALESCE(agg.subtotal, 0),
  "currency" = COALESCE(b."currency", 'ETB')
FROM (
  SELECT oi."order_id", SUM(oi."price_snapshot" * oi."quantity") AS subtotal
  FROM "order_items" oi
  GROUP BY oi."order_id"
) agg
JOIN "branches" b ON b."id" = o."branch_id"
WHERE o."id" = agg."order_id";

CREATE INDEX IF NOT EXISTS "orders_branch_id_status_created_at_idx" ON "orders"("branch_id", "status", "created_at");

-- OrderItem snapshots
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "client_line_id" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "item_name_am_snapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "modifiers_snapshot" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "line_total" DECIMAL(12,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "previous_status" "OrderItemStatus";

UPDATE "order_items"
SET
  "client_line_id" = "id",
  "line_total" = "price_snapshot" * "quantity"
WHERE "client_line_id" IS NULL;

ALTER TABLE "order_items" ALTER COLUMN "client_line_id" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "line_total" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_id_client_line_id_key" ON "order_items"("order_id", "client_line_id");
