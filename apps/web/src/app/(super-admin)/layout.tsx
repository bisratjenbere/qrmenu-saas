'use client';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';

function SuperAdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { staff, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!staff) {
        router.push('/admin/login');
      } else if (staff.role !== 'SUPER_ADMIN') {
        router.push('/admin/branches');
      }
    }
  }, [staff, isLoading, router]);

  if (isLoading || !staff || staff.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <div>Loading Super Admin Portal...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <AuthProvider>
        <SuperAdminAuthGuard>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <SuperAdminSidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', overflowX: 'hidden' }}>
              {children}
            </main>
          </div>
        </SuperAdminAuthGuard>
      </AuthProvider>
    </div>
  );
}
