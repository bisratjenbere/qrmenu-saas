'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  Clock
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  userRole: string;
  targetCompany: string;
  ipAddress: string;
  details: string;
}

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Mock platform audit entries
      const mockLogs: AuditLogEntry[] = [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 5 * 60000).toLocaleString(),
          action: 'TENANT_PROVISIONED',
          user: 'superadmin@system.com',
          userRole: 'SUPER_ADMIN',
          targetCompany: 'Demo Restaurant',
          ipAddress: '127.0.0.1',
          details: 'Provisioned new tenant with plan tier SCALE',
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 25 * 60000).toLocaleString(),
          action: 'SUPPORT_IMPERSONATION',
          user: 'superadmin@system.com',
          userRole: 'SUPER_ADMIN',
          targetCompany: 'Demo Restaurant',
          ipAddress: '127.0.0.1',
          details: 'Generated 15m support access token for admin troubleshooting',
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 120 * 60000).toLocaleString(),
          action: 'PLAN_TIER_UPDATED',
          user: 'superadmin@system.com',
          userRole: 'SUPER_ADMIN',
          targetCompany: 'Demo Restaurant',
          ipAddress: '127.0.0.1',
          details: 'Updated plan tier to SCALE',
        },
      ];
      setLogs(mockLogs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(
    l =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Platform Audit Logs
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Immutable administrative security trail recording high-risk tenant operations, impersonations, and status modifications.
          </p>
        </div>
        <button
          onClick={loadAuditLogs}
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
          Refresh Logs
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
        <div style={{ position: 'relative', width: '360px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Search action, user email, company, IP..."
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
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <ShieldCheck size={16} style={{ color: '#059669' }} /> Immutable Audit Trail Active
        </div>
      </div>

      {/* Audit Logs Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Action</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Acting Admin</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Target Tenant</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Details</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading audit logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No audit log entries matched search criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {log.timestamp}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>{log.user}</td>
                  <td style={{ padding: '1rem', color: '#0284c7', fontWeight: 500 }}>{log.targetCompany}</td>
                  <td style={{ padding: '1rem', color: '#334155', fontSize: '0.8125rem' }}>{log.details}</td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {log.ipAddress}
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
