import { createContext, useContext, useMemo, useState } from 'react';
import { childrenPropType } from '../utils/propTypes.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const value = useMemo(
    () => ({ user, setUser, loading, setLoading, authError, setAuthError }),
    [user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthContext);
}

AuthProvider.propTypes = {
  children: childrenPropType,
};
