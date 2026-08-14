'use client';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { staff, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!staff) {
        router.push('/admin/login');
      } else if (staff.role === 'SUPER_ADMIN') {
        router.push('/super-admin/tenants');
      } else if (staff.role !== 'ADMIN') {
        router.push('/staff/login');
      }
    }
  }, [staff, isLoading, router]);

  if (isLoading || !staff || (staff.role !== 'ADMIN' && staff.role !== 'SUPER_ADMIN')) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <AuthProvider>{children}</AuthProvider>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <AuthProvider>
        <AdminAuthGuard>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <AdminSidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', overflowX: 'hidden' }}>
              {children}
            </main>
          </div>
        </AdminAuthGuard>
      </AuthProvider>
    </div>
  );
}
