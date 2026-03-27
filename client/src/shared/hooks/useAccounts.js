import { useState, useCallback } from 'react';
import * as accountsApi from '../../features/accounts/services/accounts.js';
import { normalizeError } from '../utils/errors.js';

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
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

  const create = async (data) => {
    const res = await accountsApi.createAccount(data);
    setAccounts((prev) => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)));
    return res;
  };

  const update = async (id, data) => {
    const res = await accountsApi.updateAccount(id, data);
    setAccounts((prev) => prev.map((a) => (a.id === id ? res : a)));
    return res;
  };

  const remove = async (id) => {
    await accountsApi.deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return { accounts, loading, error, fetchAccounts, create, update, remove };
}
