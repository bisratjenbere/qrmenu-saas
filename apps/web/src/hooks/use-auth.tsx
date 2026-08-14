'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StaffResponse } from '@qrmenu/shared';
import { apiClient } from '../lib/api-client';
import { LoginInput } from '@qrmenu/shared';

interface AuthContextType {
  token: string | null;
  staff: StaffResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<import('@qrmenu/shared').LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedStaff = localStorage.getItem('staff');
    if (storedToken && storedStaff) {
      setToken(storedToken);
      setStaff(JSON.parse(storedStaff));
    }
    setIsLoading(false);
  }, []);

  const login = async (data: LoginInput) => {
    const res = await apiClient.login(data);
    localStorage.setItem('token', res.token);
    localStorage.setItem('staff', JSON.stringify(res.staff));
    setToken(res.token);
    setStaff(res.staff);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staff');
    setToken(null);
    setStaff(null);
    window.location.href = window.location.pathname.startsWith('/staff') ? '/staff/login' : '/admin/login';
  };

  return (
    <AuthContext.Provider value={{ token, staff, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
