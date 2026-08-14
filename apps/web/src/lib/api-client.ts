import {
  MenuResponse,
  OrderResponse,
  LoginResponse,
  StaffResponse,
  BranchResponse,
  TableResponse,
  ApiErrorResponse,
  PresignedUrlResponse,
  TableContextResponse,
  PublishPreflightResult,
  TemplateImpactPreview,
  FulfillmentType,
  CreateOrderInput,
  LoginInput,
} from '@qrmenu/shared';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}/api${endpoint}`, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/staff/login';
  }

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'API request failed' },
    }));
    throw new Error(errorData?.error?.message || 'API request failed');
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export const apiClient = {
  fetchMenu: (slug: string) => fetchApi<MenuResponse>(`/branches/${slug}/menu`),
  resolveTableToken: (slug: string, token: string) =>
    fetchApi<TableContextResponse & { serviceMode: string; enableTakeaway: boolean }>(
      `/branches/${slug}/table/${token}`
    ),
  createOrder: (data: CreateOrderInput) =>
    fetchApi<OrderResponse>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginInput) =>
    fetchApi<LoginResponse>(`/auth/login`, { method: 'POST', body: JSON.stringify(data) }),

  fetchBranches: () => fetchApi<BranchResponse[]>('/admin/branches'),
  createBranch: (data: Record<string, unknown>) =>
    fetchApi<BranchResponse>('/admin/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: Record<string, unknown>) =>
    fetchApi<BranchResponse>(`/admin/branches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  fetchOrders: (branchId: string, status?: string) =>
    fetchApi<OrderResponse[]>(
      `/orders?branchId=${branchId}${status ? `&status=${status}` : ''}`
    ),
  updateOrderStatus: (orderId: string, status: string) =>
    fetchApi<OrderResponse>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  fetchMenuAdmin: (branchId: string) =>
    fetchApi<MenuResponse[]>(`/admin/branches/${branchId}/menu`),
  createMenu: (branchId: string, data: Record<string, unknown>) =>
    fetchApi<MenuResponse>(`/admin/branches/${branchId}/menu`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  publishMenu: (menuId: string) =>
    fetchApi<{ success: boolean; warnings?: string[] }>(`/admin/menus/${menuId}/publish`, {
      method: 'POST',
    }),
  unpublishMenu: (menuId: string) =>
    fetchApi<MenuResponse>(`/admin/menus/${menuId}/unpublish`, { method: 'POST' }),
  preflightMenu: (menuId: string) =>
    fetchApi<PublishPreflightResult>(`/admin/menus/${menuId}/preflight`),
  restoreMenu: (menuId: string) =>
    fetchApi<{ success: boolean }>(`/admin/menus/${menuId}/restore`, { method: 'POST' }),
  templateImpact: (menuId: string) =>
    fetchApi<TemplateImpactPreview>(`/admin/menus/${menuId}/template-impact`),
  restoreMenuBackup: (menuId: string) =>
    fetchApi<{ success: boolean }>(`/admin/menus/${menuId}/restore-backup`, { method: 'POST' }),

  createSection: (menuId: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/admin/menus/${menuId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSection: (sectionId: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/admin/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSection: (sectionId: string) =>
    fetchApi<void>(`/admin/sections/${sectionId}`, { method: 'DELETE' }),

  createItem: (sectionId: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/admin/sections/${sectionId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateItem: (itemId: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/admin/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteItem: (itemId: string) =>
    fetchApi<void>(`/admin/items/${itemId}`, { method: 'DELETE' }),
  toggleAvailability: (itemId: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/admin/items/${itemId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  upsertModifiers: (itemId: string, groups: unknown[]) =>
    fetchApi<unknown>(`/admin/items/${itemId}/modifiers`, {
      method: 'PUT',
      body: JSON.stringify({ groups }),
    }),

  fetchTables: (branchId: string) =>
    fetchApi<TableResponse[]>(`/admin/branches/${branchId}/tables`),
  generateTables: (branchId: string, count: number) =>
    fetchApi<{ created: number }>(`/admin/branches/${branchId}/tables/generate`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),
  deleteTable: (branchId: string, tableId: string) =>
    fetchApi<void>(`/admin/branches/${branchId}/tables/${tableId}`, { method: 'DELETE' }),
  revokeTableToken: (branchId: string, tableId: string) =>
    fetchApi<TableResponse>(`/admin/branches/${branchId}/qr/table/${tableId}/revoke`, {
      method: 'POST',
    }),

  fetchStaff: () => fetchApi<StaffResponse[]>('/admin/staff'),
  createStaff: (data: Record<string, unknown>) =>
    fetchApi<StaffResponse>('/admin/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => fetchApi<void>(`/admin/staff/${id}`, { method: 'DELETE' }),

  getPresignedUrl: (data: Record<string, unknown>) =>
    fetchApi<PresignedUrlResponse>('/admin/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  fetchKitchenQueue: (branchId: string) =>
    fetchApi<{ items: unknown[] }>(`/kitchen/${branchId}/active`),
  updateKitchenItemStatus: (orderItemId: string, status: string, undo?: boolean) =>
    fetchApi<{ id: string; status: string }>(`/kitchen/items/${orderItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, undo }),
    }),
  saveUpsellLinks: (itemId: string, targetItemIds: string[]) =>
    fetchApi<{ success: boolean }>(`/admin/items/${itemId}/upsells`, {
      method: 'POST',
      body: JSON.stringify({ targetItemIds }),
    }),

  fetchTenants: () =>
    fetchApi<import('@qrmenu/shared').TenantResponse[]>('/super-admin/tenants'),
  createTenant: (data: import('@qrmenu/shared').CreateTenantInput) =>
    fetchApi<import('@qrmenu/shared').TenantResponse>('/super-admin/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTenant: (id: string, data: import('@qrmenu/shared').UpdateTenantInput) =>
    fetchApi<unknown>(`/super-admin/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTenant: (id: string) =>
    fetchApi<void>(`/super-admin/tenants/${id}`, { method: 'DELETE' }),
  resetTenantPassword: (id: string, newPassword: string) =>
    fetchApi<{ success: boolean }>(`/super-admin/tenants/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  fetchPlatformAnalytics: () =>
    fetchApi<import('@qrmenu/shared').PlatformAnalyticsResponse>('/super-admin/analytics'),
  impersonateTenant: (companyId: string) =>
    fetchApi<import('@qrmenu/shared').LoginResponse>(`/super-admin/impersonate/${companyId}`, {
      method: 'POST',
    }),

  fetchDomains: () =>
    fetchApi<import('@qrmenu/shared').CustomDomainResponse[]>('/super-admin/domains'),
  createDomain: (data: { companyId: string; domain: string }) =>
    fetchApi<import('@qrmenu/shared').CustomDomainResponse>('/super-admin/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyDomain: (id: string) =>
    fetchApi<import('@qrmenu/shared').CustomDomainResponse>(
      `/super-admin/domains/${id}/verify`,
      { method: 'POST' }
    ),
  deleteDomain: (id: string) =>
    fetchApi<void>(`/super-admin/domains/${id}`, { method: 'DELETE' }),

  fetchPresetTemplates: () =>
    fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse[]>('/super-admin/templates'),
  createPresetTemplate: (data: Record<string, unknown>) =>
    fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse>('/super-admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePresetTemplate: (id: string, data: Record<string, unknown>) =>
    fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse>(
      `/super-admin/templates/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  deletePresetTemplate: (id: string) =>
    fetchApi<void>(`/super-admin/templates/${id}`, { method: 'DELETE' }),

  fetchInvoices: () =>
    fetchApi<import('@qrmenu/shared').TenantInvoiceResponse[]>('/super-admin/invoices'),
  createInvoice: (data: Record<string, unknown>) =>
    fetchApi<import('@qrmenu/shared').TenantInvoiceResponse>('/super-admin/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markInvoicePaid: (id: string) =>
    fetchApi<import('@qrmenu/shared').TenantInvoiceResponse>(
      `/super-admin/invoices/${id}/mark-paid`,
      { method: 'PATCH' }
    ),

  exportTenantData: (tenantId: string) =>
    fetchApi<unknown>(`/super-admin/tenants/${tenantId}/export`, { method: 'POST' }),

  fetchSystemSettings: () =>
    fetchApi<import('@qrmenu/shared').SystemSettingResponse[]>('/super-admin/settings'),
  updateSystemSetting: (data: { key: string; value: string; description?: string }) =>
    fetchApi<import('@qrmenu/shared').SystemSettingResponse>('/super-admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  fetchMenuTemplates: () => fetchApi<unknown[]>('/admin/menu-templates'),
  applyTemplate: (
    menuId: string,
    templateId?: string,
    sections?: unknown[],
    confirmReplace?: boolean
  ) =>
    fetchApi<MenuResponse>(`/admin/menus/${menuId}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId, sections, confirmReplace }),
    }),
  updateBranchTheme: (branchId: string, themeId: string) =>
    fetchApi<BranchResponse>(`/admin/branches/${branchId}/theme`, {
      method: 'PATCH',
      body: JSON.stringify({ themeId }),
    }),
};

export { FulfillmentType };
