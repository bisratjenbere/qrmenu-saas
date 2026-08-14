// ─── Service & QR modes ───────────────────────────────────────────

export const ServiceMode = {
  MENU_ONLY: 'MENU_ONLY',
  SINGLE_QR_SELF_ORDER: 'SINGLE_QR_SELF_ORDER',
  PER_TABLE_QR: 'PER_TABLE_QR',
} as const;
export type ServiceMode = (typeof ServiceMode)[keyof typeof ServiceMode];

export const QrMode = {
  SINGLE: 'SINGLE',
  PER_TABLE: 'PER_TABLE',
} as const;
export type QrMode = (typeof QrMode)[keyof typeof QrMode];

export const TableInputMode = {
  FREE_TEXT: 'FREE_TEXT',
  VALIDATED: 'VALIDATED',
} as const;
export type TableInputMode = (typeof TableInputMode)[keyof typeof TableInputMode];

export const FulfillmentType = {
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
  ROOM_SERVICE: 'ROOM_SERVICE',
} as const;
export type FulfillmentType = (typeof FulfillmentType)[keyof typeof FulfillmentType];

export const PrimaryLanguage = {
  AM: 'AM',
  EN: 'EN',
} as const;
export type PrimaryLanguage = (typeof PrimaryLanguage)[keyof typeof PrimaryLanguage];

/** Map legacy QrMode to ServiceMode for backward compatibility */
export function qrModeToServiceMode(qrMode: QrMode): ServiceMode {
  return qrMode === QrMode.PER_TABLE
    ? ServiceMode.PER_TABLE_QR
    : ServiceMode.SINGLE_QR_SELF_ORDER;
}

export function serviceModeToQrMode(serviceMode: ServiceMode): QrMode {
  return serviceMode === ServiceMode.PER_TABLE_QR ? QrMode.PER_TABLE : QrMode.SINGLE;
}

export const OrderStatus = {
  NEW: 'NEW',
  SEEN: 'SEEN',
  SERVED: 'SERVED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const MenuStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type MenuStatus = (typeof MenuStatus)[keyof typeof MenuStatus];

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

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.SEEN],
  [OrderStatus.SEEN]: [OrderStatus.SERVED],
  [OrderStatus.SERVED]: [],
};

export const VALID_ORDER_ITEM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.PENDING]: [OrderItemStatus.PREPARING],
  [OrderItemStatus.PREPARING]: [OrderItemStatus.READY],
  [OrderItemStatus.READY]: [OrderItemStatus.PREPARING],
};

// ─── Limits ───

export const MAX_ITEM_QUANTITY = 99;
export const MAX_NOTE_LENGTH = 200;
export const MAX_TABLE_LABEL_LENGTH = 20;
export const MAX_ITEMS_PER_ORDER = 50;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
