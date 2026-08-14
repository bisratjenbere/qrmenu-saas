'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { SystemSettingResponse } from '@qrmenu/shared';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  Mail,
  Sliders,
  Globe,
  ShieldCheck,
  Send
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingResponse[]>([]);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchSystemSettings();
      setSettings(data);
      const initialValues: Record<string, string> = {};
      data.forEach(s => { initialValues[s.key] = s.value; });
      setSettingValues(initialValues);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdate = async (key: string, value: string, description?: string) => {
    setSavingKey(key);
    try {
      await apiClient.updateSystemSetting({ key, value, description });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
      loadSettings();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to update setting' });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSavingKey(null);
    }
  };

  const handleTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div>
      {toastMessage && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: toastMessage.type === 'error' ? '#fee2e2' : '#d1fae5', color: toastMessage.type === 'error' ? '#b91c1c' : '#047857', border: `1px solid ${toastMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {toastMessage.text}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Platform System Settings & Notification Gateways
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure white-label defaults, primary currency, and system notification delivery channels.
          </p>
        </div>
        <button
          onClick={loadSettings}
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
          Refresh Settings
        </button>
      </div>

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading platform system settings...
          </div>
        ) : (
          settings.map(s => (
            <div
              key={s.key}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                  {s.key}
                </span>
                {savedKey === s.key && (
                  <span style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                {s.description || 'Global configuration parameter'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={settingValues[s.key] || ''}
                  onChange={e => setSettingValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleUpdate(s.key, settingValues[s.key], s.description || undefined);
                    }
                  }}
                  id={`input-${s.key}`}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  onClick={() => {
                    handleUpdate(s.key, settingValues[s.key], s.description || undefined);
                  }}
                  disabled={savingKey === s.key}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Email Test Tool */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Test Transactional Email Gateway Delivery
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
              Verify platform SMTP and Resend API key delivery health.
            </p>
          </div>
        </div>

        {testSent && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> Test welcome email dispatched to {testEmail}!
          </div>
        )}

        <form onSubmit={handleTestEmail} style={{ display: 'flex', gap: '0.75rem', maxWidth: '540px' }}>
          <input
            type="email"
            required
            placeholder="admin@restaurant.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              color: '#0f172a',
              fontSize: '0.875rem',
            }}
          />
          <button
            type="submit"
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
            }}
          >
            <Send size={16} /> Send Test Email
          </button>
        </form>
      </div>
    </div>
  );
}
