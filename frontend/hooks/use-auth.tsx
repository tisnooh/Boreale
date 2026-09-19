'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import type { UserDTO } from '@/lib/types';

interface AuthContextValue {
  user: UserDTO | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (input: { email: string; password: string; firstName?: string; lastName?: string; marketingOptin?: boolean }) => Promise<UserDTO>;
  logout: () => Promise<void>;
  updateProfile: (patch: { firstName?: string; lastName?: string; phone?: string; marketingOptin?: boolean }) => Promise<UserDTO>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data: UserDTO }>('/api/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.code !== 'network_error') {
        // 401 = pas connecté : état normal, pas de log
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email, password) => {
        const res = await api.post<{ data: UserDTO }>('/api/auth/login', { email, password });
        setUser(res.data);
        return res.data;
      },
      register: async (input) => {
        const res = await api.post<{ data: UserDTO }>('/api/auth/register', input);
        setUser(res.data);
        return res.data;
      },
      logout: async () => {
        await api.post('/api/auth/logout').catch(() => undefined);
        setUser(null);
      },
      updateProfile: async (patch) => {
        const res = await api.patch<{ data: UserDTO }>('/api/me', patch);
        setUser(res.data);
        return res.data;
      },
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
