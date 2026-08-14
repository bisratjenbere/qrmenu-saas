'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TenantResponse } from '@qrmenu/shared';
import {
  Download,
  Database,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  ShieldCheck
} from 'lucide-react';

export default function SuperAdminBackupsPage() {
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchTenants();
      setTenants(data);
    } catch (err: any) {
      console.error('Failed to load tenants for backup export:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleExport = async (tenant: TenantResponse) => {
    setExportingId(tenant.id);
    try {
      const data = await apiClient.exportTenantData(tenant.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `backup-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      setSuccessMessage(`Successfully exported backup for ${tenant.name}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Data export failed');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div>
      {errorMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {successMessage}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            1-Click Tenant Data Exports & Backups
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Generate full JSON/CSV data archives for compliance, migrations, or disaster recovery.
          </p>
        </div>
        <button
          onClick={loadTenants}
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
          Refresh List
        </button>
      </div>

      {/* Info Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HardDrive size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Automated Database Archive Generator
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.125rem 0 0 0' }}>
            Exported packages include tenant configuration, branch menus, sections, items, staff details, tables, and order histories.
          </p>
        </div>
      </div>

      {/* Tenants Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Tenant Restaurant</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Slug</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Branches</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Orders Count</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading tenant backup list...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No tenant restaurants found.
                </td>
              </tr>
            ) : (
              tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>{t.name}</td>
                  <td style={{ padding: '1rem', color: '#0284c7', fontWeight: 500 }}>{t.slug}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{t.branchesCount} locations</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{t.ordersCount} total orders</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleExport(t)}
                      disabled={exportingId === t.id}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.375rem 0.875rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <Download size={14} />
                      {exportingId === t.id ? 'Packaging JSON...' : 'Export Full JSON Backup'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
