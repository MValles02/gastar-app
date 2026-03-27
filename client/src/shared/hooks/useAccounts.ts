import { useState, useCallback } from 'react';
import * as accountsApi from '../../features/accounts/services/accounts.js';
import { normalizeError } from '../utils/errors.js';
import type { Account } from '../types/domain.types.js';

export interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;
  error: string;
  fetchAccounts: () => Promise<void>;
  create: (data: Partial<Account>) => Promise<Account>;
  update: (id: string, data: Partial<Account>) => Promise<Account>;
  remove: (id: string) => Promise<void>;
}

export function useAccounts(): UseAccountsReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await accountsApi.getAccounts();
      setAccounts(res);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data: Partial<Account>): Promise<Account> => {
    const res = await accountsApi.createAccount(data);
    setAccounts((prev) => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)));
    return res;
  };

  const update = async (id: string, data: Partial<Account>): Promise<Account> => {
    const res = await accountsApi.updateAccount(id, data);
    setAccounts((prev) => prev.map((a) => (a.id === id ? res : a)));
    return res;
  };

  const remove = async (id: string): Promise<void> => {
    await accountsApi.deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return { accounts, loading, error, fetchAccounts, create, update, remove };
}
