import api from '../../../shared/services/api.js';
import type { Category } from '../../../shared/types/domain.types.js';

export async function getCategories(): Promise<Category[]> {
  const res = await api.get('/categories');
  return res.data.data;
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const res = await api.post('/categories', data);
  return res.data.data;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  const res = await api.put(`/categories/${id}`, data);
  return res.data.data;
}

export async function deleteCategory(id: string): Promise<unknown> {
  const res = await api.delete(`/categories/${id}`);
  return res.data.data;
}
