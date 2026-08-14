'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TenantResponse, CreateTenantInput } from '@qrmenu/shared';
import {
  Building2,
  Plus,
  Search,
  UserCheck,
  Trash2,
  RefreshCw,
  Key,
  CheckCircle2,
  ShieldCheck,
  Sliders
} from 'lucide-react';

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Password Reset Modal State
  const [resetTenant, setResetTenant] = useState<TenantResponse | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  // Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTenantInput>({
    companyName: '',
    companySlug: '',
    planTier: 'SCALE',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchTenants();
      setTenants(data);
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setResetTenant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setFormData(prev => ({
      ...prev,
      companyName: name,
      companySlug: slug,
    }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.createTenant(formData);
      setIsCreateModalOpen(false);
      setFormData({
        companyName: '',
        companySlug: '',
        planTier: 'SCALE',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
      loadTenants();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to provision tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: TenantResponse) => {
    setActionLoadingId(tenant.id);
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient.updateTenant(tenant.id, { status: nextStatus });
      loadTenants();
    } catch (err: any) {
      showToast(err.message || 'Failed to update tenant status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangePlan = async (tenantId: string, planTier: 'PILOT' | 'SCALE' | 'ENTERPRISE') => {
    setActionLoadingId(tenantId);
    try {
      await apiClient.updateTenant(tenantId, { planTier });
      loadTenants();
    } catch (err: any) {
      showToast(err.message || 'Failed to update plan tier', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTenant = async (tenant: TenantResponse) => {
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This will permanently delete all branches, menus, staff, and orders.`)) {
      return;
    }
    setActionLoadingId(tenant.id);
    try {
      await apiClient.deleteTenant(tenant.id);
      loadTenants();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tenant', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImpersonate = async (tenant: TenantResponse) => {
    setActionLoadingId(tenant.id);
    try {
      const res = await apiClient.impersonateTenant(tenant.id);
      localStorage.setItem('token', res.token);
      localStorage.setItem('staff', JSON.stringify(res.staff));
      window.location.href = '/admin/branches';
    } catch (err: any) {
      showToast(err.message || 'Impersonation failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTenant || !newPassword) return;
    setResetting(true);
    setResetError('');
    setResetSuccess('');
    try {
      await apiClient.resetTenantPassword(resetTenant.id, newPassword);
      setResetSuccess(`Password for ${resetTenant.adminEmail || resetTenant.name} reset successfully!`);
      setTimeout(() => {
        setResetTenant(null);
        setNewPassword('');
        setResetSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const filteredTenants = tenants.filter(
    t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.adminEmail && t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {toastMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          background: toastType === 'error' ? '#fee2e2' : '#d1fae5',
          color: toastType === 'error' ? '#dc2626' : '#059669',
          border: `1px solid ${toastType === 'error' ? '#fca5a5' : '#a7f3d0'}`,
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {toastMessage}
          <button
            onClick={() => setToastMessage('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold', fontSize: '1.25rem' }}
          >
            ×
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Tenants & Provisioning
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            System-wide platform management across all active paying tenant companies.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
          }}
        >
          <Plus size={18} />
          Provision New Tenant
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search tenant name, slug, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
        <button
          onClick={loadTenants}
          title="Refresh tenants list"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tenants Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Tenant Company</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Plan Tier</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Admin Email</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Branches</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Total Orders</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading tenants data...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No tenant companies found.
                </td>
              </tr>
            ) : (
              filteredTenants.map(tenant => (
                <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{tenant.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 500 }}>{tenant.slug}.menu.app</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          tenant.status === 'ACTIVE'
                            ? '#d1fae5'
                            : tenant.status === 'SUSPENDED'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          tenant.status === 'ACTIVE'
                            ? '#065f46'
                            : tenant.status === 'SUSPENDED'
                            ? '#991b1b'
                            : '#92400e',
                      }}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      value={tenant.planTier}
                      onChange={e => handleChangePlan(tenant.id, e.target.value as any)}
                      style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="PILOT">PILOT</option>
                      <option value="SCALE">SCALE</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{tenant.adminEmail}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{tenant.branchesCount}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{tenant.ordersCount}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleStatus(tenant)}
                        disabled={actionLoadingId === tenant.id}
                        style={{
                          background: tenant.status === 'ACTIVE' ? '#fee2e2' : '#d1fae5',
                          color: tenant.status === 'ACTIVE' ? '#dc2626' : '#059669',
                          border: 'none',
                          borderRadius: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: actionLoadingId === tenant.id ? 'not-allowed' : 'pointer',
                          opacity: actionLoadingId === tenant.id ? 0.7 : 1,
                        }}
                      >
                        {actionLoadingId === tenant.id ? 'Processing...' : (tenant.status === 'ACTIVE' ? 'Suspend' : 'Activate')}
                      </button>
                      <button
                        onClick={() => handleImpersonate(tenant)}
                        disabled={actionLoadingId === tenant.id}
                        title="Impersonate Tenant Admin"
                        style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          borderRadius: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: actionLoadingId === tenant.id ? 'not-allowed' : 'pointer',
                          opacity: actionLoadingId === tenant.id ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <UserCheck size={14} />
                        {actionLoadingId === tenant.id ? 'Logging in...' : 'Support Login'}
                      </button>
                      <button
                        onClick={() => setResetTenant(tenant)}
                        title="Reset Admin Password"
                        style={{
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Key size={14} />
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant)}
                        disabled={actionLoadingId === tenant.id}
                        title="Delete Tenant"
                        style={{
                          background: 'transparent',
                          color: actionLoadingId === tenant.id ? '#dc2626' : '#94a3b8',
                          border: 'none',
                          padding: '0.375rem',
                          cursor: actionLoadingId === tenant.id ? 'not-allowed' : 'pointer',
                          opacity: actionLoadingId === tenant.id ? 0.5 : 1,
                        }}
                        onMouseEnter={e => {
                          if (actionLoadingId !== tenant.id) {
                            e.currentTarget.style.color = '#dc2626';
                          }
                        }}
                        onMouseLeave={e => {
                          if (actionLoadingId !== tenant.id) {
                            e.currentTarget.style.color = '#94a3b8';
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Provision Tenant Modal */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '540px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '0.5rem' }}>
              Provision New Tenant Company
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Create a new client account with a default branch, admin credentials, and published menu.
            </p>

            {errorMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Company / Restaurant Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Burger King"
                  value={formData.companyName}
                  onChange={e => handleNameChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Company Slug
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="burger-king"
                    value={formData.companySlug}
                    onChange={e => setFormData({ ...formData, companySlug: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Plan Tier
                  </label>
                  <select
                    value={formData.planTier}
                    onChange={e => setFormData({ ...formData, planTier: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="PILOT">PILOT (Single Location)</option>
                    <option value="SCALE">SCALE (Multi Branch)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Custom)</option>
                  </select>
                </div>
              </div>

              <hr style={{ borderColor: '#f1f5f9', margin: '0.5rem 0' }} />

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Tenant Admin Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.adminName}
                  onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@burgerking.com"
                    value={formData.adminEmail}
                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 chars"
                    value={formData.adminPassword}
                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      color: '#0f172a',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTenant && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetTenant(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '440px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '0.5rem' }}>
              Reset Admin Password
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Instantly set a new login password for <strong>{resetTenant.name}</strong> ({resetTenant.adminEmail}).
            </p>

            {resetSuccess && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> {resetSuccess}
              </div>
            )}

            {resetError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  New Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Enter new password (min 8 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setResetTenant(null); setNewPassword(''); setResetError(''); }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {resetting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
