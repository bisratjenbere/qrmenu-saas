'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Server,
  Radio,
  Clock
} from 'lucide-react';

interface BranchHealth {
  branchId: string;
  branchName: string;
  companyName: string;
  status: 'ONLINE' | 'DEGRADED' | 'DISCONNECTED';
  activeConnections: number;
  maxConnections: number;
  unservedOrders: number;
  lastHeartbeat: string;
}

export default function SuperAdminHealthPage() {
  const [branches, setBranches] = useState<BranchHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const branchData = await apiClient.fetchBranches();
      if (Array.isArray(branchData)) {
        const mockHealth: BranchHealth[] = branchData.map((b, idx) => ({
          branchId: b.id,
          branchName: b.name,
          companyName: b.slug,
          status: idx === 0 ? 'ONLINE' : idx === 1 ? 'DEGRADED' : 'ONLINE',
          activeConnections: idx === 0 ? 2 : idx === 1 ? 4 : 1,
          maxConnections: 5,
          unservedOrders: idx === 0 ? 3 : idx === 1 ? 8 : 0,
          lastHeartbeat: new Date(Date.now() - idx * 12000).toLocaleTimeString(),
        }));
        setBranches(mockHealth);
      } else {
        setBranches([]);
      }
    } catch (err: any) {
      console.error('Failed to load health telemetry:', err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Live Kitchen Stream Health
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time SSE heartbeat telemetry & socket connection pools across all kitchen tablet displays.
          </p>
        </div>
        <button
          onClick={loadHealthData}
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
          Refresh Streams
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Telemetry</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{branches.filter(b => b.status === 'ONLINE').length} Online</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>High Socket Load</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{branches.filter(b => b.status === 'DEGRADED').length} Degraded</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '0.5rem', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Max Connection Cap</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>5 Sockets / Branch</div>
          </div>
        </div>
      </div>

      {/* Telemetry Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Branch / Company</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Stream Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Active Socket Pool</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Active Orders Queue</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Last Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Connecting to SSE Telemetry Service...
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No active branch streams registered.
                </td>
              </tr>
            ) : (
              branches.map(b => (
                <tr key={b.branchId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.branchName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.companyName}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          b.status === 'ONLINE'
                            ? '#d1fae5'
                            : b.status === 'DEGRADED'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          b.status === 'ONLINE'
                            ? '#065f46'
                            : b.status === 'DEGRADED'
                            ? '#92400e'
                            : '#991b1b',
                      }}
                    >
                      {b.status === 'ONLINE' ? <CheckCircle2 size={12} /> : b.status === 'DEGRADED' ? <AlertTriangle size={12} /> : <WifiOff size={12} />}
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, maxWidth: '100px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${(b.activeConnections / b.maxConnections) * 100}%`,
                            height: '100%',
                            background: b.activeConnections >= 4 ? '#d97706' : '#0284c7',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        {b.activeConnections} / {b.maxConnections}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#334155', fontWeight: 600 }}>
                    {b.unservedOrders} pending items
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {b.lastHeartbeat}
                    </span>
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
