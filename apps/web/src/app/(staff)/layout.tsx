import { AuthProvider } from '@/hooks/use-auth';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-staff-bg)', color: 'var(--color-staff-text)' }}>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
