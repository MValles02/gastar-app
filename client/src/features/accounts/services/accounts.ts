import api from '../../../shared/services/api.js';
import type { Account } from '../../../shared/types/domain.types.js';

export async function getAccounts(): Promise<Account[]> {
  const res = await api.get('/accounts');
  return res.data.data;
}

export async function createAccount(data: Partial<Account> & Record<string, unknown>): Promise<Account> {
  const res = await api.post('/accounts', data);
  return res.data.data;
}

export async function updateAccount(id: string, data: Partial<Account> & Record<string, unknown>): Promise<Account> {
  const res = await api.put(`/accounts/${id}`, data);
  return res.data.data;
}

export async function deleteAccount(id: string): Promise<unknown> {
  const res = await api.delete(`/accounts/${id}`);
  return res.data.data;
}
