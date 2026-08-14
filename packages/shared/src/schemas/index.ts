import { z } from 'zod';
import {
  MAX_ITEM_QUANTITY,
  MAX_NOTE_LENGTH,
  MAX_TABLE_LABEL_LENGTH,
  MAX_ITEMS_PER_ORDER,
  ALLOWED_IMAGE_TYPES,
  OrderStatus,
  QrMode,
  StaffRole,
} from '../constants';

// ─── Auth ───────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Branch ─────────────────────────────────────────

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  qrMode: z.nativeEnum(QrMode).optional().default('SINGLE'),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  qrMode: z.nativeEnum(QrMode).optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

// ─── Menu ───────────────────────────────────────────

export const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(100).optional().default('Main Menu'),
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

// ─── Section ────────────────────────────────────────

export const createSectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).optional().default(0),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;

// ─── MenuItem ───────────────────────────────────────

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().positive('Price must be positive'),
  photoUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().positive('Price must be positive').optional(),
  photoUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

// ─── Table ──────────────────────────────────────────

export const createTableSchema = z.object({
  label: z.string().trim().min(1).max(MAX_TABLE_LABEL_LENGTH),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const generateTablesSchema = z.object({
  count: z.number().int().min(1).max(200),
});
export type GenerateTablesInput = z.infer<typeof generateTablesSchema>;

// ─── Order (Customer) ──────────────────────────────

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
  notes: z.string().trim().max(MAX_NOTE_LENGTH).nullable().optional(),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  tableNumber: z.string().trim().min(1).max(MAX_TABLE_LABEL_LENGTH),
  idempotencyKey: z.string().uuid(),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must have at least one item')
    .max(MAX_ITEMS_PER_ORDER),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── Order Status Update (Staff) ────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum([OrderStatus.SEEN, OrderStatus.SERVED]),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ─── Staff Management ──────────────────────────────

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(StaffRole),
  branchId: z.string().uuid().nullable().optional(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// ─── Upload ─────────────────────────────────────────

export const presignedUrlSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;

// ─── QR Generation ──────────────────────────────────

export const generateQrSchema = z.object({
  format: z.enum(['png', 'svg']).optional().default('png'),
});
export type GenerateQrInput = z.infer<typeof generateQrSchema>;

// ─── Super Admin Tenant Management ─────────────────

export const createTenantSchema = z.object({
  companyName: z.string().trim().min(1).max(100),
  companySlug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  planTier: z.enum(['PILOT', 'SCALE', 'ENTERPRISE']).optional().default('SCALE'),
  adminName: z.string().trim().min(1).max(100),
  adminEmail: z.string().email().trim().toLowerCase(),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']).optional(),
  planTier: z.enum(['PILOT', 'SCALE', 'ENTERPRISE']).optional(),
  name: z.string().trim().min(1).max(100).optional(),
});
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
