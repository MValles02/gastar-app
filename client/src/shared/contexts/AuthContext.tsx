import { createContext, useContext, useMemo, useState } from 'react';
import type { User } from '../types/domain.types.js';

interface AuthContextValue {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  authError: string;
  setAuthError: React.Dispatch<React.SetStateAction<string>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const value = useMemo(
    () => ({ user, setUser, loading, setLoading, authError, setAuthError }),
    [user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider');
  return ctx;
}
