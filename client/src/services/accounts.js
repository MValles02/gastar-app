import api from './api.js';

export async function getAccounts() {
  const res = await api.get('/accounts');
  return res.data.data;
}

export async function createAccount(data) {
  const res = await api.post('/accounts', data);
  return res.data.data;
}

export async function updateAccount(id, data) {
  const res = await api.put(`/accounts/${id}`, data);
  return res.data.data;
}

export async function deleteAccount(id) {
  const res = await api.delete(`/accounts/${id}`);
  return res.data.data;
}
