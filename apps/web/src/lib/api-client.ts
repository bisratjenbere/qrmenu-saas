import {
  MenuResponse, OrderResponse, LoginResponse, StaffResponse,
  BranchResponse, TableResponse, ApiErrorResponse, PresignedUrlResponse
} from '@qrmenu/shared';
import { CreateOrderInput, LoginInput } from '@qrmenu/shared';

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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'API request failed');
  }

  if (response.status === 204) return {} as T;
  
  return response.json();
}

export const apiClient = {
  fetchMenu: (slug: string) => fetchApi<MenuResponse>(`/branches/${slug}/menu`),
  createOrder: (data: CreateOrderInput) => fetchApi<OrderResponse>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginInput) => fetchApi<LoginResponse>(`/auth/login`, { method: 'POST', body: JSON.stringify(data) }),
  
  // Admin & Staff Endpoints
  fetchBranches: () => fetchApi<BranchResponse[]>('/admin/branches'),
  createBranch: (data: any) => fetchApi<BranchResponse>('/admin/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: any) => fetchApi<BranchResponse>(`/admin/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  fetchOrders: (branchId: string, status?: string) => fetchApi<OrderResponse[]>(`/orders?branchId=${branchId}${status ? `&status=${status}` : ''}`),
  updateOrderStatus: (orderId: string, status: string) => fetchApi<OrderResponse>(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  
  fetchMenuAdmin: (branchId: string) => fetchApi<MenuResponse>(`/admin/branches/${branchId}/menu`),
  createMenu: (branchId: string, data: any) => fetchApi<MenuResponse>(`/admin/branches/${branchId}/menu`, { method: 'POST', body: JSON.stringify(data) }),
  publishMenu: (menuId: string) => fetchApi<{ success: boolean }>(`/admin/menus/${menuId}/publish`, { method: 'POST' }),
  
  createSection: (menuId: string, data: any) => fetchApi<any>(`/admin/menus/${menuId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (sectionId: string, data: any) => fetchApi<any>(`/admin/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSection: (sectionId: string) => fetchApi<void>(`/admin/sections/${sectionId}`, { method: 'DELETE' }),
  
  createItem: (sectionId: string, data: any) => fetchApi<any>(`/admin/sections/${sectionId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (itemId: string, data: any) => fetchApi<any>(`/admin/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (itemId: string) => fetchApi<void>(`/admin/items/${itemId}`, { method: 'DELETE' }),
  toggleAvailability: (itemId: string, isAvailable: boolean) => fetchApi<any>(`/admin/items/${itemId}/availability`, { method: 'PATCH', body: JSON.stringify({ isAvailable }) }),
  
  fetchTables: (branchId: string) => fetchApi<TableResponse[]>(`/admin/branches/${branchId}/tables`),
  generateTables: (branchId: string, count: number) => fetchApi<{ created: number }>(`/admin/branches/${branchId}/tables/generate`, { method: 'POST', body: JSON.stringify({ count }) }),
  deleteTable: (branchId: string, tableId: string) => fetchApi<void>(`/admin/branches/${branchId}/tables/${tableId}`, { method: 'DELETE' }),
  
  fetchStaff: () => fetchApi<StaffResponse[]>('/admin/staff'),
  createStaff: (data: any) => fetchApi<StaffResponse>('/admin/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => fetchApi<void>(`/admin/staff/${id}`, { method: 'DELETE' }),
  
  getPresignedUrl: (data: any) => fetchApi<PresignedUrlResponse>('/admin/upload/presigned-url', { method: 'POST', body: JSON.stringify(data) }),

  fetchKitchenQueue: (branchId: string) => fetchApi<{ items: any[], aggregated: any[] }>(`/kitchen/${branchId}/active`),
  updateKitchenItemStatus: (orderItemId: string, status: string) => fetchApi<{ id: string, status: string }>(`/kitchen/items/${orderItemId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  saveUpsellLinks: (itemId: string, targetItemIds: string[]) => fetchApi<{ success: boolean }>(`/admin/items/${itemId}/upsells`, { method: 'POST', body: JSON.stringify({ targetItemIds }) }),

  // Super Admin Endpoints
  fetchTenants: () => fetchApi<import('@qrmenu/shared').TenantResponse[]>('/super-admin/tenants'),
  createTenant: (data: import('@qrmenu/shared').CreateTenantInput) => fetchApi<import('@qrmenu/shared').TenantResponse>('/super-admin/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: string, data: import('@qrmenu/shared').UpdateTenantInput) => fetchApi<any>(`/super-admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTenant: (id: string) => fetchApi<void>(`/super-admin/tenants/${id}`, { method: 'DELETE' }),
  resetTenantPassword: (id: string, newPassword: string) => fetchApi<{ success: boolean }>(`/super-admin/tenants/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  fetchPlatformAnalytics: () => fetchApi<import('@qrmenu/shared').PlatformAnalyticsResponse>('/super-admin/analytics'),
  impersonateTenant: (companyId: string) => fetchApi<import('@qrmenu/shared').LoginResponse>(`/super-admin/impersonate/${companyId}`, { method: 'POST' }),

  // Domains
  fetchDomains: () => fetchApi<import('@qrmenu/shared').CustomDomainResponse[]>('/super-admin/domains'),
  createDomain: (data: { companyId: string; domain: string }) => fetchApi<import('@qrmenu/shared').CustomDomainResponse>('/super-admin/domains', { method: 'POST', body: JSON.stringify(data) }),
  verifyDomain: (id: string) => fetchApi<import('@qrmenu/shared').CustomDomainResponse>(`/super-admin/domains/${id}/verify`, { method: 'POST' }),
  deleteDomain: (id: string) => fetchApi<void>(`/super-admin/domains/${id}`, { method: 'DELETE' }),

  // Templates
  fetchPresetTemplates: () => fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse[]>('/super-admin/templates'),
  createPresetTemplate: (data: { name: string; nameAmharic?: string; description?: string; category?: string; sectionsJson: string }) => fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse>('/super-admin/templates', { method: 'POST', body: JSON.stringify(data) }),
  updatePresetTemplate: (id: string, data: { name?: string; nameAmharic?: string; description?: string; category?: string; sectionsJson?: string }) => fetchApi<import('@qrmenu/shared').MenuPresetTemplateResponse>(`/super-admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePresetTemplate: (id: string) => fetchApi<void>(`/super-admin/templates/${id}`, { method: 'DELETE' }),

  // Invoicing
  fetchInvoices: () => fetchApi<import('@qrmenu/shared').TenantInvoiceResponse[]>('/super-admin/invoices'),
  createInvoice: (data: { companyId: string; invoiceNumber?: string; amount: number; currency?: string; paymentMethod?: string; dueDateDays?: number }) => fetchApi<import('@qrmenu/shared').TenantInvoiceResponse>('/super-admin/invoices', { method: 'POST', body: JSON.stringify(data) }),
  markInvoicePaid: (id: string) => fetchApi<import('@qrmenu/shared').TenantInvoiceResponse>(`/super-admin/invoices/${id}/mark-paid`, { method: 'PATCH' }),

  // Exports
  exportTenantData: (tenantId: string) => fetchApi<any>(`/super-admin/tenants/${tenantId}/export`, { method: 'POST' }),

  // Settings
  fetchSystemSettings: () => fetchApi<import('@qrmenu/shared').SystemSettingResponse[]>('/super-admin/settings'),
  updateSystemSetting: (data: { key: string; value: string; description?: string }) => fetchApi<import('@qrmenu/shared').SystemSettingResponse>('/super-admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // Branch Templates & Themes
  fetchMenuTemplates: () => fetchApi<any[]>('/admin/menu-templates'),
  applyTemplate: (menuId: string, templateId?: string, sections?: any[]) => fetchApi<MenuResponse>(`/admin/menus/${menuId}/apply-template`, { method: 'POST', body: JSON.stringify({ templateId, sections }) }),
  updateBranchTheme: (branchId: string, themeId: string) => fetchApi<BranchResponse>(`/admin/branches/${branchId}/theme`, { method: 'PATCH', body: JSON.stringify({ themeId }) }),
};
