import api from './api.js';

export async function getSummary(params = {}) {
  const res = await api.get('/reports/summary', { params });
  return res.data.data;
}

export async function getByCategory(params = {}) {
  const res = await api.get('/reports/by-category', { params });
  return res.data.data;
}

export async function getMonthly(params = {}) {
  const res = await api.get('/reports/monthly', { params });
  return res.data.data;
}

export async function getFrequency(params = {}) {
  const res = await api.get('/reports/frequency', { params });
  return res.data.data;
}
