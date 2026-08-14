'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { CustomDomainResponse, TenantResponse } from '@qrmenu/shared';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function SuperAdminDomainsPage() {
  const [domains, setDomains] = useState<CustomDomainResponse[]>([]);
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [domainList, tenantList] = await Promise.all([
        apiClient.fetchDomains(),
        apiClient.fetchTenants(),
      ]);
      setDomains(domainList);
      setTenants(tenantList);
      if (tenantList.length > 0) setCompanyId(tenantList[0].id);
    } catch (err: any) {
      console.error('Failed to load domains data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.createDomain({ companyId, domain: domainInput.trim().toLowerCase() });
      setIsModalOpen(false);
      setDomainInput('');
      setToastMessage('Domain created successfully');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to bind custom domain');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await apiClient.verifyDomain(id);
      setToastMessage('Domain verified successfully');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || 'DNS CNAME verification failed');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to unbind this custom domain?')) return;
    setDeletingId(id);
    try {
      await apiClient.deleteDomain(id);
      setToastMessage('Domain deleted successfully');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete custom domain');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDomains = domains.filter(
    d =>
      d.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Custom CNAME Domain Mapping
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Bind enterprise client custom subdomains (e.g. menu.kaldiscoffee.com) with automated SSL certification.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
          Bind Custom Domain
        </button>
      </div>

      {toastMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: toastType === 'success' ? '#d1fae5' : '#fee2e2', color: toastType === 'success' ? '#065f46' : '#dc2626', border: `1px solid ${toastType === 'success' ? '#a7f3d0' : '#fca5a5'}`, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {toastMessage}
        </div>
      )}

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
            placeholder="Search custom domain or restaurant..."
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
          onClick={loadData}
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
          Refresh Domains
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Custom Hostname</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Tenant Restaurant</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>DNS Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>SSL Certificate</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading custom domains...
                </td>
              </tr>
            ) : filteredDomains.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No custom domain mappings configured.
                </td>
              </tr>
            ) : (
              filteredDomains.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Globe size={16} style={{ color: '#0284c7' }} /> {d.domain}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#334155', fontWeight: 500 }}>{d.companyName}</td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: d.status === 'VERIFIED' ? '#d1fae5' : '#fef3c7',
                        color: d.status === 'VERIFIED' ? '#065f46' : '#92400e',
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: d.sslActive ? '#e0f2fe' : '#f1f5f9',
                        color: d.sslActive ? '#0369a1' : '#64748b',
                      }}
                    >
                      <Lock size={12} /> {d.sslActive ? 'Active (Auto-Renew)' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {d.status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleVerify(d.id)}
                          disabled={verifyingId === d.id}
                          style={{
                            background: '#d1fae5',
                            color: '#059669',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: verifyingId === d.id ? 'not-allowed' : 'pointer',
                            opacity: verifyingId === d.id ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {verifyingId === d.id ? <RefreshCw size={12} /> : null} Verify CNAME
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        style={{
                          background: 'transparent',
                          color: '#94a3b8',
                          border: 'none',
                          padding: '0.375rem',
                          cursor: deletingId === d.id ? 'not-allowed' : 'pointer',
                          opacity: deletingId === d.id ? 0.5 : 1
                        }}
                      >
                        {deletingId === d.id ? <RefreshCw size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '1rem', width: '100%', maxWidth: '480px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: '0.5rem' }}>
              Bind Custom CNAME Domain
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Configure a custom domain mapping for an Enterprise client.
            </p>

            {errorMsg && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateDomain} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Select Tenant Restaurant
                </label>
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Custom Hostname / Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. menu.kaldiscoffee.com"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Binding...' : 'Bind Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
