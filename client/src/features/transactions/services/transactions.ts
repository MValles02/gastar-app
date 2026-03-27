import api from '../../../shared/services/api.js';
import type { Transaction } from '../../../shared/types/domain.types.js';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  transactions: TransactionWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransactionWithRelations extends Transaction {
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  category?: {
    id: string;
    name: string;
    icon?: string | null;
  };
  transferToAccount?: {
    id: string;
    name: string;
  };
}

export async function getTransactions(params: TransactionFilters = {}): Promise<TransactionListResponse> {
  const res = await api.get('/transactions', { params });
  return res.data.data;
}

export async function createTransaction(data: Partial<Transaction> & Record<string, unknown>): Promise<Transaction> {
  const res = await api.post('/transactions', data);
  return res.data.data;
}

export async function updateTransaction(id: string, data: Partial<Transaction> & Record<string, unknown>): Promise<Transaction> {
  const res = await api.put(`/transactions/${id}`, data);
  return res.data.data;
}

export async function deleteTransaction(id: string): Promise<unknown> {
  const res = await api.delete(`/transactions/${id}`);
  return res.data.data;
}
