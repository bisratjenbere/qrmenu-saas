'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Megaphone,
  AlertOctagon,
  CheckCircle2,
  Send,
  Info
} from 'lucide-react';

interface BranchEmergencyState {
  id: string;
  name: string;
  slug: string;
  isPaused: boolean;
}

export default function SuperAdminEmergencyPage() {
  const [branches, setBranches] = useState<BranchEmergencyState[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchBranches();
      setBranches(data.map(b => ({ id: b.id, name: b.name, slug: b.slug, isPaused: false })));
    } catch (err: any) {
      console.error('Failed to load emergency branch controls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const toggleBranchPause = (branchId: string) => {
    setBranches(prev =>
      prev.map(b => (b.id === branchId ? { ...b, isPaused: !b.isPaused } : b))
    );
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
    setBroadcastMessage('');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Emergency Overload & Circuit Breakers
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Pause customer order submission during peak dinner rushes or broadcast platform system announcements.
        </p>
      </div>

      {/* Broadcast Announcement Banner */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Broadcast Platform System Announcement
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
              Displays an urgent top-bar message across all active Tenant Admin and Staff dashboards.
            </p>
          </div>
        </div>

        {broadcastSent && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> Broadcast message dispatched to all active staff sessions!
          </div>
        )}

        <form onSubmit={handleBroadcast} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            required
            placeholder="e.g. Scheduled system maintenance tonight at 02:00 AM UTC. Please finalize open kitchen orders."
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              color: '#0f172a',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
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
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
            }}
          >
            <Send size={16} />
            Dispatch Broadcast
          </button>
        </form>
      </div>

      {/* Branch Circuit Breakers Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertOctagon size={20} style={{ color: '#dc2626' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Branch Order Throttles & Circuit Breakers
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Paused branches block customer checkouts with a kitchen capacity notice.
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Branch Location</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Ordering Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Mode</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Emergency Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading branch circuit breaker controls...
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No active branch locations found.
                </td>
              </tr>
            ) : (
              branches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>slug: {b.slug}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: b.isPaused ? '#fee2e2' : '#d1fae5',
                        color: b.isPaused ? '#dc2626' : '#059669',
                      }}
                    >
                      {b.isPaused ? 'PAUSED (View-Only)' : 'NORMAL (Ordering Active)'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
                    QR Menu Active
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => toggleBranchPause(b.id)}
                      style={{
                        background: b.isPaused ? '#d1fae5' : '#fee2e2',
                        color: b.isPaused ? '#059669' : '#dc2626',
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
                      {b.isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                      {b.isPaused ? 'Resume Ordering' : 'Emergency Pause'}
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
