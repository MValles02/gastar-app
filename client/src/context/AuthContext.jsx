import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { normalizeError } from '../utils/errors.js';
import { childrenPropType } from '../utils/propTypes.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadSession = () => {
    setLoading(true);
    setAuthError('');

    api.get('/auth/me')
      .then(res => setUser(res.data.data))
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
  };

  useEffect(() => {
    loadSession();
  }, []);

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

  const value = useMemo(
    () => ({ user, loading, authError, loadSession, login, register, logout, updateProfile }),
    [user, loading, authError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

AuthProvider.propTypes = {
  children: childrenPropType,
};
