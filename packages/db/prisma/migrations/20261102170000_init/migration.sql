-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "QrMode" AS ENUM ('SINGLE', 'PER_TABLE');

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('MENU_ONLY', 'SINGLE_QR_SELF_ORDER', 'PER_TABLE_QR');

-- CreateEnum
CREATE TYPE "TableInputMode" AS ENUM ('FREE_TEXT', 'VALIDATED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'ROOM_SERVICE');

-- CreateEnum
CREATE TYPE "MenuStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'SEEN', 'SERVED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('PILOT', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY');

-- CreateEnum
CREATE TYPE "OperationsMode" AS ENUM ('SIMPLE_SERVICE', 'TABLE_SERVICE', 'KITCHEN_AND_SERVICE');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('REQUESTED', 'ACKNOWLEDGED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'TELEBIRR', 'WIRE', 'CASH');

-- CreateEnum
CREATE TYPE "PrimaryLanguage" AS ENUM ('AM', 'EN');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'SCALE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "qr_mode" "QrMode" NOT NULL DEFAULT 'SINGLE',
    "service_mode" "ServiceMode" NOT NULL DEFAULT 'SINGLE_QR_SELF_ORDER',
    "operations_mode" "OperationsMode" NOT NULL DEFAULT 'SIMPLE_SERVICE',
    "cover_image_url" TEXT,
    "logo_url" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "map_url" TEXT,
    "wifi_ssid" TEXT,
    "wifi_password" TEXT,
    "opening_hours_json" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "service_charge_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theme_id" TEXT NOT NULL DEFAULT 'mesob-classic',
    "primary_language" "PrimaryLanguage" NOT NULL DEFAULT 'AM',
    "table_input_mode" "TableInputMode" NOT NULL DEFAULT 'VALIDATED',
    "enable_takeaway" BOOLEAN NOT NULL DEFAULT true,
    "enable_room_service" BOOLEAN NOT NULL DEFAULT false,
    "call_waiter_enabled" BOOLEAN NOT NULL DEFAULT false,
    "request_bill_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_number" TEXT,
    "restaurant_type" TEXT,
    "setup_step" INTEGER NOT NULL DEFAULT 0,
    "setup_started_at" TIMESTAMP(3),
    "setup_completed_at" TIMESTAMP(3),
    "first_published_at" TIMESTAMP(3),
    "setup_draft_backup_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "qr_token_revoked_at" TIMESTAMP(3),

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Menu',
    "status" "MenuStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_sections" (
    "id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "time_slot" TEXT NOT NULL DEFAULT 'ALL_DAY',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "description" TEXT,
    "description_amharic" TEXT,
    "kitchen_description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "photo_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "unavailable_reason" TEXT,
    "unavailable_until" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "dietaryLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spice_level" INTEGER NOT NULL DEFAULT 0,
    "prep_time_min" INTEGER,
    "calories" INTEGER,
    "serving_size" TEXT,
    "is_combo" BOOLEAN NOT NULL DEFAULT false,
    "combo_item_count" INTEGER,
    "combo_price" DECIMAL(10,2),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
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

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "price_delta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_number" TEXT NOT NULL,
    "fulfillment_type" "FulfillmentType" NOT NULL DEFAULT 'DINE_IN',
    "table_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "idempotency_key" TEXT NOT NULL,
    "guest_access_token" TEXT NOT NULL,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "pickup_note" TEXT,
    "pickup_time" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "service_charge_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "service_charge_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "table_number" TEXT NOT NULL,
    "table_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BILL',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "idempotency_key" TEXT NOT NULL,
    "guest_access_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "client_line_id" TEXT NOT NULL,
    "item_name_snapshot" TEXT NOT NULL,
    "item_name_am_snapshot" TEXT,
    "price_snapshot" DECIMAL(10,2) NOT NULL,
    "modifiers_snapshot" JSONB NOT NULL DEFAULT '[]',
    "line_total" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "previous_status" "OrderItemStatus",

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_upsells" (
    "id" TEXT NOT NULL,
    "source_item_id" TEXT NOT NULL,
    "target_item_id" TEXT NOT NULL,

    CONSTRAINT "menu_item_upsells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "ssl_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_preset_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_amharic" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "sections_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_preset_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_slug_key" ON "branches"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qr_token_key" ON "tables"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "tables_branch_id_label_key" ON "tables"("branch_id", "label");

-- CreateIndex
CREATE INDEX "menus_branch_id_status_idx" ON "menus"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_guest_access_token_key" ON "orders"("guest_access_token");

-- CreateIndex
CREATE INDEX "orders_branch_id_status_created_at_idx" ON "orders"("branch_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_idempotency_key_key" ON "service_requests"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_guest_access_token_key" ON "service_requests"("guest_access_token");

-- CreateIndex
CREATE INDEX "service_requests_branch_id_status_created_at_idx" ON "service_requests"("branch_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_client_line_id_key" ON "order_items"("order_id", "client_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_upsells_source_item_id_target_item_id_key" ON "menu_item_upsells"("source_item_id", "target_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoices_invoice_number_key" ON "tenant_invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "menu_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_upsells" ADD CONSTRAINT "menu_item_upsells_source_item_id_fkey" FOREIGN KEY ("source_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_upsells" ADD CONSTRAINT "menu_item_upsells_target_item_id_fkey" FOREIGN KEY ("target_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
