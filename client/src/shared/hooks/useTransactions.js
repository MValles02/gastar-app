import { useState, useCallback } from 'react';
import * as transactionsApi from '../../features/transactions/services/transactions.js';
import { normalizeError } from '../utils/errors.js';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await transactionsApi.getTransactions(filters);
      setTransactions(res);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data) => {
    const res = await transactionsApi.createTransaction(data);
    return res;
  };

  const update = async (id, data) => {
    const res = await transactionsApi.updateTransaction(id, data);
    setTransactions((prev) => prev.map((t) => (t.id === id ? res : t)));
    return res;
  };

  const remove = async (id) => {
    await transactionsApi.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return { transactions, loading, error, fetchTransactions, create, update, remove };
}
