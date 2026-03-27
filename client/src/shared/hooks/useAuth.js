import { useCallback, useEffect } from 'react';
import { useAuthState } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { normalizeError } from '../utils/errors.js';

export function useAuth() {
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

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAuthError('');
    setUser(res.data.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
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

  const updateProfile = async (data) => {
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
