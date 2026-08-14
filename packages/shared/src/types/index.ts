// ─── API Response Types ─────────────────────────────
// Used by both the API (response shaping) and the frontend (typed fetch).

export interface BranchResponse {
  id: string;
  name: string;
  slug: string;
  qrMode: 'SINGLE' | 'PER_TABLE';
  companyId: string;
  coverImageUrl?: string | null;
  tagline?: string | null;
  currency?: string;
  serviceChargePercent?: number;
  vatPercent?: number;
  themeId?: string;
}

export interface MenuItemResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  description: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  popularityScore: number;
  upsellIds?: string[];
  dietaryLabels?: string[];
  allergens?: string[];
  spiceLevel?: number;
  prepTimeMin?: number | null;
  calories?: number | null;
  servingSize?: string | null;
  isCombo?: boolean;
  comboItemCount?: number | null;
  comboPrice?: number | null;
}

export interface MenuSectionResponse {
  id: string;
  name: string;
  nameAmharic?: string | null;
  sortOrder: number;
  timeSlot?: string;
  items: MenuItemResponse[];
}

export interface MenuResponse {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED';
  branch: {
    id: string;
    name: string;
    slug: string;
    qrMode: 'SINGLE' | 'PER_TABLE';
    coverImageUrl?: string | null;
    tagline?: string | null;
    currency?: string;
    serviceChargePercent?: number;
    vatPercent?: number;
  };
  sections: MenuSectionResponse[];
}

export interface OrderItemResponse {
  id: string;
  menuItemId: string;
  itemNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

export interface OrderResponse {
  id: string;
  branchId: string;
  tableNumber: string;
  status: 'NEW' | 'SEEN' | 'SERVED';
  idempotencyKey: string;
  createdAt: string;
  items: OrderItemResponse[];
  total: number;
}

export interface TableResponse {
  id: string;
  branchId: string;
  label: string;
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
  | SSEHeartbeatEvent
  | SSEShutdownEvent;

// ─── API Error Response ─────────────────────────────

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
