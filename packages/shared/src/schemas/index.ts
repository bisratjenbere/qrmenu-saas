import { z } from 'zod';
import {
  MAX_ITEM_QUANTITY,
  MAX_NOTE_LENGTH,
  MAX_TABLE_LABEL_LENGTH,
  MAX_ITEMS_PER_ORDER,
  ALLOWED_IMAGE_TYPES,
  OrderStatus,
  QrMode,
  ServiceMode,
  OperationsMode,
  StaffRole,
  TableInputMode,
  FulfillmentType,
  PrimaryLanguage,
} from '../constants.js';
import { ALL_DIETARY_LABELS } from '../constants/dietary.js';

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
  qrMode: z.nativeEnum(QrMode).optional().default(QrMode.SINGLE),
  serviceMode: z.nativeEnum(ServiceMode).optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  restaurantType: z.string().trim().min(1).max(50).nullable().optional(),
  qrMode: z.nativeEnum(QrMode).optional(),
  serviceMode: z.nativeEnum(ServiceMode).optional(),
  operationsMode: z.nativeEnum(OperationsMode).optional(),
  tagline: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  mapUrl: z.string().url().nullable().optional(),
  wifiSsid: z.string().trim().max(100).nullable().optional(),
  wifiPassword: z.string().trim().max(100).nullable().optional(),
  openingHoursJson: z.string().trim().max(10_000).nullable().optional(),
  instagramUrl: z.string().url().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  serviceChargePercent: z.number().min(0).max(100).optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  primaryLanguage: z.nativeEnum(PrimaryLanguage).optional(),
  tableInputMode: z.nativeEnum(TableInputMode).optional(),
  enableTakeaway: z.boolean().optional(),
  enableRoomService: z.boolean().optional(),
  callWaiterEnabled: z.boolean().optional(),
  requestBillEnabled: z.boolean().optional(),
  whatsappNumber: z.string().trim().max(20).nullable().optional(),
  setupStep: z.number().int().min(0).max(7).optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const createBillRequestSchema = z.object({
  branchId: z.string().uuid(),
  tableNumber: z.string().trim().min(1).max(MAX_TABLE_LABEL_LENGTH).optional(),
  tableToken: z.string().uuid().optional(),
  guestName: z.string().trim().min(1).max(100).optional(),
  guestPhone: z.string().trim().min(5).max(30).optional(),
  pickupNote: z.string().trim().max(MAX_NOTE_LENGTH).optional(),
  pickupTime: z.string().trim().max(60).optional(),
  idempotencyKey: z.string().uuid(),
});
export type CreateBillRequestInput = z.infer<typeof createBillRequestSchema>;

// ─── Menu ───────────────────────────────────────────

export const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(100).optional().default('Main Menu'),
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

// ─── Section ────────────────────────────────────────

export const createSectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  nameAmharic: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  timeSlot: z.string().optional().default('ALL_DAY'),
  isVisible: z.boolean().optional().default(true),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  nameAmharic: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  timeSlot: z.string().optional(),
  isVisible: z.boolean().optional(),
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

// ─── Modifier ───────────────────────────────────────

export const modifierOptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  nameAmharic: z.string().trim().max(100).nullable().optional(),
  priceDelta: z.number().min(0).optional().default(0),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const modifierGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  nameAmharic: z.string().trim().max(100).nullable().optional(),
  required: z.boolean().optional().default(false),
  minSelect: z.number().int().min(0).optional().default(0),
  maxSelect: z.number().int().min(1).optional().default(1),
  sortOrder: z.number().int().min(0).optional().default(0),
  options: z.array(modifierOptionSchema).min(1),
});

export const upsertModifierGroupsSchema = z.object({
  groups: z.array(modifierGroupSchema),
});
export type UpsertModifierGroupsInput = z.infer<typeof upsertModifierGroupsSchema>;

// ─── MenuItem ───────────────────────────────────────

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nameAmharic: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  descriptionAmharic: z.string().trim().max(1000).nullable().optional(),
  kitchenDescription: z.string().trim().max(1000).nullable().optional(),
  price: z.number().positive('Price must be positive'),
  photoUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional().default(true),
  unavailableReason: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  dietaryLabels: z.array(z.enum(ALL_DIETARY_LABELS as [string, ...string[]])).optional(),
  allergens: z.array(z.string()).optional(),
  spiceLevel: z.number().int().min(0).max(3).optional(),
  prepTimeMin: z.number().int().min(0).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  servingSize: z.string().trim().max(100).nullable().optional(),
  isCombo: z.boolean().optional(),
  comboItemCount: z.number().int().min(1).nullable().optional(),
  comboPrice: z.number().positive().nullable().optional(),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  unavailableReason: z.string().trim().max(200).nullable().optional(),
  unavailableUntil: z.string().datetime().nullable().optional(),
});

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

export const orderLineModifierSchema = z.object({
  groupId: z.string().uuid(),
  groupName: z.string().trim().min(1),
  optionId: z.string().uuid(),
  optionName: z.string().trim().min(1),
  priceDelta: z.number().min(0),
});

export const orderItemSchema = z.object({
  clientLineId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
  notes: z.string().trim().max(MAX_NOTE_LENGTH).nullable().optional(),
  selectedModifiers: z.array(orderLineModifierSchema).default([]),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  fulfillmentType: z.nativeEnum(FulfillmentType),
  tableNumber: z.string().trim().max(MAX_TABLE_LABEL_LENGTH).optional(),
  tableToken: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid(),
  guestName: z.string().trim().max(100).nullable().optional(),
  guestPhone: z.string().trim().max(30).nullable().optional(),
  pickupNote: z.string().trim().max(500).nullable().optional(),
  pickupTime: z.string().trim().max(50).nullable().optional(),
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

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY']),
  undo: z.boolean().optional(),
});
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;

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

// ─── Template apply ─────────────────────────────────

const templateItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameAmharic: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  descriptionAmharic: z.string().trim().max(1000).optional(),
  price: z.number().positive(),
  spiceLevel: z.number().int().min(0).max(3).optional(),
  dietaryLabels: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  servingSize: z.string().trim().max(100).optional(),
  isCombo: z.boolean().optional(),
  comboItemCount: z.number().int().positive().optional(),
  comboPrice: z.number().positive().optional(),
  prepTimeMin: z.number().int().positive().optional(),
});

export const menuTemplateSectionsSchema = z.array(z.object({
  name: z.string().trim().min(1).max(100),
  nameAmharic: z.string().trim().max(100).optional(),
  timeSlot: z.enum(['ALL_DAY', 'BREAKFAST', 'LUNCH_DINNER']).optional(),
  isVisible: z.boolean().optional(),
  items: z.array(templateItemSchema).min(1),
})).min(1);

export const applyTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  sections: menuTemplateSectionsSchema.optional(),
  confirmReplace: z.boolean().optional(),
});
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;

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
