
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const current = await authService.me();
      setUser(current);
      setError(null);
      return current;
    } catch (requestError) {
      setUser(null);
      setError(requestError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Existing email/password login
  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);

    setUser(response.user);
    setError(null);

    return response.user;
  }, []);

  // Google login
  const loginWithGoogle = useCallback(
    async ({ credential, acceptTerms, preferredLanguage }) => {
      const response = await authService.googleLogin({
        credential,
        acceptTerms,
        preferredLanguage,
      });

      setUser(response.user);
      setError(null);

      return response.user;
    },
    []
  );

  const logout = useCallback(async () => {
    await authService.logout();

    setUser(null);
    setError(null);
  }, []);

  const updateLanguage = useCallback(async (preferredLanguage) => {
    try {
      const updated = await authService.updateLanguage(preferredLanguage);

      setUser(updated);
      return updated;
    } catch (requestError) {
      if (requestError?.status === 401) {
        setUser(null);
      }

      throw requestError;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      loginWithGoogle,
      logout,
      refresh,
      updateLanguage,
    }),
    [
      user,
      loading,
      error,
      login,
      loginWithGoogle,
      logout,
      refresh,
      updateLanguage,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}