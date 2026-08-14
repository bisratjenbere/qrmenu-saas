'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  BarChart3,
  Activity,
  ShieldAlert,
  FileText,
  Globe,
  LayoutTemplate,
  CreditCard,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const { staff, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('super_admin_sidebar_collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('super_admin_sidebar_collapsed', String(next));
  };

  const navGroups: NavGroup[] = [
    {
      label: 'TENANT MANAGEMENT',
      items: [
        {
          href: '/super-admin/tenants',
          label: 'Tenants & Provisioning',
          icon: Building2,
        },
        {
          href: '/super-admin/domains',
          label: 'Custom CNAME Domains',
          icon: Globe,
        },
      ],
    },
    {
      label: 'SYSTEM OPERATIONS',
      items: [
        {
          href: '/super-admin/health',
          label: 'Live Kitchen Health',
          icon: Activity,
          badge: 'LIVE',
        },
        {
          href: '/super-admin/emergency',
          label: 'Emergency Overload',
          icon: ShieldAlert,
        },
      ],
    },
    {
      label: 'GOVERNANCE & AUDIT',
      items: [
        {
          href: '/super-admin/audit',
          label: 'Platform Audit Logs',
          icon: FileText,
        },
        {
          href: '/super-admin/backups',
          label: 'Data Exports & Backups',
          icon: Download,
        },
      ],
    },
    {
      label: 'FINANCE & TEMPLATES',
      items: [
        {
          href: '/super-admin/billing',
          label: 'Invoicing & Payments',
          icon: CreditCard,
        },
        {
          href: '/super-admin/templates',
          label: 'Starter Presets',
          icon: LayoutTemplate,
        },
      ],
    },
    {
      label: 'SYSTEM CONFIG',
      items: [
        {
          href: '/super-admin/settings',
          label: 'Platform Settings',
          icon: Settings,
        },
        {
          href: '/super-admin/analytics',
          label: 'Platform Analytics',
          icon: BarChart3,
        },
      ],
    },
  ];

  const initials = staff?.name
    ? staff.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SA';

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        minHeight: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40,
        boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.02)',
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 1.25rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            <Shield size={20} />
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                QR SaaS
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Super Admin
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={toggleCollapse}
            title="Collapse sidebar"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {!collapsed && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  padding: '0 0.625rem 0.375rem 0.625rem',
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '0.625rem 0' : '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0369a1' : '#475569',
                    background: isActive ? '#f0f9ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon
                      size={18}
                      style={{
                        color: isActive ? '#0284c7' : '#64748b',
                        flexShrink: 0,
                        transition: 'color 0.15s ease',
                      }}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        background: '#d1fae5',
                        color: '#047857',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Expand Toggle for Collapsed */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Footer Profile & Logout */}
      <div
        style={{
          padding: '0.875rem',
          borderTop: '1px solid #f1f5f9',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {staff?.name || 'Super Admin'}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0284c7', letterSpacing: '0.04em' }}>
                  SUPER ADMIN
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem 0',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </aside>
  );
}
