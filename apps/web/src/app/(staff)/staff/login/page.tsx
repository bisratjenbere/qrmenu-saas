'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      router.push('/staff/dashboard');
    } catch (e: any) {
      alert(e.message || 'Login failed');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--color-staff-surface)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Staff Login</h1>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'var(--color-staff-bg)', color: 'white', borderColor: 'var(--color-staff-border)' }} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'var(--color-staff-bg)', color: 'white', borderColor: 'var(--color-staff-border)' }} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
      </form>
    </div>
  );
}
