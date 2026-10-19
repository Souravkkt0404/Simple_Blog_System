import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client';
import { authApi } from '../api/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const applySession = useCallback((session) => {
    setAccessToken(session?.accessToken ?? null);
    setToken(session?.accessToken ?? null);
    setUser(session?.user ?? null);
  }, []);

  // Restore the session on page load using the httpOnly refresh cookie.
  const restoreSession = useCallback(async () => {
    try {
      applySession(await refreshSession());
      return true;
    } catch {
      applySession(null);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    setSessionExpiredHandler(() => applySession(null));
    restoreSession().finally(() => setInitializing(false));
  }, [applySession, restoreSession]);

  const login = useCallback(async (credentials) => applySession(await authApi.login(credentials)), [applySession]);
  const register = useCallback(async (payload) => applySession(await authApi.register(payload)), [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      restoreSession,
      setUser,
    }),
    [user, token, initializing, login, register, logout, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
