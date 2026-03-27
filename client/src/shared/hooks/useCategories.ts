import { useState, useCallback } from 'react';
import * as categoriesApi from '../../features/categories/services/categories.js';
import { normalizeError } from '../utils/errors.js';
import type { Category } from '../types/domain.types.js';

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string;
  fetchCategories: () => Promise<void>;
  create: (data: Partial<Category>) => Promise<Category>;
  update: (id: string, data: Partial<Category>) => Promise<Category>;
  remove: (id: string) => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await categoriesApi.getCategories();
      setCategories(res);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (data: Partial<Category>): Promise<Category> => {
    const res = await categoriesApi.createCategory(data);
    setCategories((prev) => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)));
    return res;
  };

  const update = async (id: string, data: Partial<Category>): Promise<Category> => {
    const res = await categoriesApi.updateCategory(id, data);
    setCategories((prev) => prev.map((c) => (c.id === id ? res : c)));
    return res;
  };

  const remove = async (id: string): Promise<void> => {
    await categoriesApi.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return { categories, loading, error, fetchCategories, create, update, remove };
}
