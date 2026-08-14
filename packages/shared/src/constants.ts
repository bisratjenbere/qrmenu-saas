// ─── Enums (mirrored from Prisma for frontend use without Prisma dependency) ───

export const OrderStatus = {
  NEW: 'NEW',
  SEEN: 'SEEN',
  SERVED: 'SERVED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const MenuStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
export type MenuStatus = (typeof MenuStatus)[keyof typeof MenuStatus];

export const QrMode = {
  SINGLE: 'SINGLE',
  PER_TABLE: 'PER_TABLE',
} as const;
export type QrMode = (typeof QrMode)[keyof typeof QrMode];

export const StaffRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const CompanyStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TRIAL: 'TRIAL',
} as const;
export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const PlanTier = {
  PILOT: 'PILOT',
  SCALE: 'SCALE',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const OrderItemStatus = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
} as const;
export type OrderItemStatus = (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

// ─── Valid Order Status Transitions ───

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.SEEN],
  [OrderStatus.SEEN]: [OrderStatus.SERVED],
  [OrderStatus.SERVED]: [],
};

// ─── Limits ───

export const MAX_ITEM_QUANTITY = 99;
export const MAX_NOTE_LENGTH = 200;
export const MAX_TABLE_LABEL_LENGTH = 20;
export const MAX_ITEMS_PER_ORDER = 50;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
