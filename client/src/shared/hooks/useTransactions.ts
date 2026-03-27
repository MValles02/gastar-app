import { useState, useCallback } from 'react';
import * as transactionsApi from '../../features/transactions/services/transactions.js';
import { normalizeError } from '../utils/errors.js';
import type { Transaction } from '../types/domain.types.js';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  create: (data: Partial<Transaction>) => Promise<Transaction>;
  update: (id: string, data: Partial<Transaction>) => Promise<Transaction>;
  remove: (id: string) => Promise<void>;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async (filters: TransactionFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await transactionsApi.getTransactions(filters);
      setTransactions(res.transactions);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data: Partial<Transaction>): Promise<Transaction> => {
    const res = await transactionsApi.createTransaction(data);
    return res;
  };

  const update = async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const res = await transactionsApi.updateTransaction(id, data);
    setTransactions((prev) => prev.map((t) => (t.id === id ? res : t)));
    return res;
  };

  const remove = async (id: string): Promise<void> => {
    await transactionsApi.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return { transactions, loading, error, fetchTransactions, create, update, remove };
}
