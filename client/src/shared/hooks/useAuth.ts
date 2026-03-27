import { useCallback } from 'react';
import { useAuthState } from '../contexts/AuthContext.js';
import api from '../services/api.js';
import { normalizeError } from '../utils/errors.js';
import type { User } from '../types/domain.types.js';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  authError: string;
  loadSession: () => void;
  login: (email: string, password: string) => Promise<unknown>;
  register: (name: string, email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  deleteAccount: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, setUser, loading, setLoading, authError, setAuthError } = useAuthState();

  const loadSession = useCallback(() => {
    setLoading(true);
    setAuthError('');
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch((error) => {
        const normalized = normalizeError(error, 'No pudimos validar tu sesión.');
        if (normalized.status === 401) {
          setUser(null);
          return;
        }
        setUser(null);
        setAuthError(normalized.message);
      })
      .finally(() => setLoading(false));
  }, [setUser, setLoading, setAuthError]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAuthError('');
    setUser(res.data.data.user);
    return res.data;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    setAuthError('');
    setUser(res.data.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout failures
    }
    setAuthError('');
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>): Promise<User> => {
    const res = await api.patch('/auth/me', data);
    setUser(res.data.data);
    return res.data.data;
  };

  const deleteAccount = async () => {
    await api.delete('/auth/me');
    setAuthError('');
    setUser(null);
  };

  return { user, loading, authError, loadSession, login, register, logout, updateProfile, deleteAccount };
}
