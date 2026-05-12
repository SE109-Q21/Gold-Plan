'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRefreshToken,
  apiRegister,
} from '@/lib/auth.api';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  getAccessToken: () => string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  register(email: string, password: string): Promise<{ message: string }>;
  refreshToken(): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Keep access token in memory only — never persisted to localStorage
  const tokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    tokenRef.current = token;
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const { accessToken } = await apiRefreshToken();
        tokenRef.current = accessToken;
        return accessToken;
      } catch {
        tokenRef.current = null;
        setUser(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  // On mount: attempt silent refresh → if success, fetch user profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accessToken = await refreshToken();
        if (cancelled) return;
        if (!accessToken) {
          setUser(null);
          return;
        }
        const me = await apiGetMe(accessToken);
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          tokenRef.current = null;
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: me } = await apiLogin(email, password);
    setAccessToken(accessToken);
    setUser(me);
  }, [setAccessToken]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [setAccessToken]);

  const register = useCallback(async (email: string, password: string) => {
    return apiRegister(email, password);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    getAccessToken: () => tokenRef.current,
    login,
    logout,
    register,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
