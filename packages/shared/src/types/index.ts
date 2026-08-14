// ─── API Response Types ─────────────────────────────

import type {
  ServiceMode,
  QrMode,
  FulfillmentType,
  PrimaryLanguage,
  TableInputMode,
} from '../constants';
import type { DietaryLabel } from '../constants/dietary';

export interface ModifierOptionResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  priceDelta: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ModifierGroupResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: ModifierOptionResponse[];
}

export interface BranchResponse {
  id: string;
  name: string;
  slug: string;
  qrMode: QrMode;
  serviceMode: ServiceMode;
  companyId: string;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  openingHoursJson?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  currency?: string;
  serviceChargePercent?: number;
  vatPercent?: number;
  themeId?: string;
  primaryLanguage?: PrimaryLanguage;
  tableInputMode?: TableInputMode;
  enableTakeaway?: boolean;
  enableRoomService?: boolean;
  callWaiterEnabled?: boolean;
  requestBillEnabled?: boolean;
  whatsappNumber?: string | null;
  setupStep?: number;
}

export interface MenuItemResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  description: string | null;
  descriptionAmharic?: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
  unavailableReason?: string | null;
  unavailableUntil?: string | null;
  sortOrder: number;
  popularityScore: number;
  upsellIds?: string[];
  dietaryLabels?: DietaryLabel[];
  allergens?: string[];
  spiceLevel?: number;
  prepTimeMin?: number | null;
  calories?: number | null;
  servingSize?: string | null;
  isCombo?: boolean;
  comboItemCount?: number | null;
  comboPrice?: number | null;
  modifierGroups?: ModifierGroupResponse[];
}

export interface MenuSectionResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  sortOrder: number;
  timeSlot?: string;
  isVisible?: boolean;
  items: MenuItemResponse[];
}

export interface MenuResponse {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version?: number;
  branch: {
    id: string;
    name: string;
    slug: string;
    qrMode: QrMode;
    serviceMode: ServiceMode;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    tagline?: string | null;
    description?: string | null;
    phone?: string | null;
    address?: string | null;
    mapUrl?: string | null;
    wifiSsid?: string | null;
    wifiPassword?: string | null;
    openingHoursJson?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    currency?: string;
    serviceChargePercent?: number;
    vatPercent?: number;
    primaryLanguage?: PrimaryLanguage;
    tableInputMode?: TableInputMode;
    enableTakeaway?: boolean;
    enableRoomService?: boolean;
    callWaiterEnabled?: boolean;
    requestBillEnabled?: boolean;
    whatsappNumber?: string | null;
  };
  sections: MenuSectionResponse[];
}

export interface OrderLineModifierSnapshot {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItemResponse {
  id: string;
  clientLineId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  itemNameAmSnapshot?: string | null;
  priceSnapshot: number;
  modifiersSnapshot: OrderLineModifierSnapshot[];
  lineTotal: number;
  quantity: number;
  notes: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

export interface OrderMoneyResponse {
  currency: string;
  subtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
}

export interface OrderResponse extends OrderMoneyResponse {
  id: string;
  branchId: string;
  tableNumber: string;
  fulfillmentType: FulfillmentType;
  tableId?: string | null;
  status: 'NEW' | 'SEEN' | 'SERVED';
  idempotencyKey: string;
  createdAt: string;
  items: OrderItemResponse[];
  /** @deprecated use grandTotal */
  total: number;
}

export interface TableResponse {
  id: string;
  branchId: string;
  label: string;
  qrToken?: string;
}

export interface TableContextResponse {
  tableId: string;
  label: string;
  branchSlug: string;
  locked: boolean;
}

export interface StaffResponse {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
  branchId: string | null;
  companyId: string | null;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  planTier: 'PILOT' | 'SCALE' | 'ENTERPRISE';
  createdAt: string;
  branchesCount: number;
  staffCount: number;
  ordersCount: number;
  adminEmail?: string;
  adminName?: string;
}

export interface PlatformAnalyticsResponse {
  totalTenants: number;
  activeTenants: number;
  totalBranches: number;
  totalOrders: number;
  totalSystemRevenue: number;
}

export interface LoginResponse {
  token: string;
  staff: StaffResponse;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface CustomDomainResponse {
  id: string;
  companyId: string;
  companyName: string;
  domain: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  sslActive: boolean;
  createdAt: string;
}

export interface MenuPresetTemplateResponse {
  id: string;
  name: string;
  nameAmharic: string | null;
  description: string | null;
  category: string;
  sectionsJson: string;
  createdAt: string;
}

export interface TenantInvoiceResponse {
  id: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paymentMethod: 'BANK_TRANSFER' | 'TELEBIRR' | 'WIRE' | 'CASH';
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface SystemSettingResponse {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface PublishPreflightResult {
  canPublish: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateImpactPreview {
  sectionsToReplace: number;
  itemsToReplace: number;
  modifierGroupsAffected: number;
  backupAvailable: boolean;
}

// ─── SSE Event Types ────────────────────────────────

export interface SSENewOrderEvent {
  type: 'new-order';
  data: OrderResponse;
}

export interface SSEOrderUpdatedEvent {
  type: 'order-updated';
  data: {
    id: string;
    status: 'NEW' | 'SEEN' | 'SERVED';
  };
}

export interface SSEOrderItemUpdatedEvent {
  type: 'order-item-updated';
  data: {
    id: string;
    orderId: string;
    status: 'PENDING' | 'PREPARING' | 'READY';
  };
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  data: Record<string, never>;
}

export interface SSEShutdownEvent {
  type: 'server-shutdown';
  data: { reason: string };
}

export type SSEEvent =
  | SSENewOrderEvent
  | SSEOrderUpdatedEvent
  | SSEOrderItemUpdatedEvent
  | SSEHeartbeatEvent
  | SSEShutdownEvent;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
