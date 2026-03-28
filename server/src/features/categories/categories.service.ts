import prisma from '../../shared/utils/prisma.js';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { createCategorySchema, updateCategorySchema } from './categories.validators.js';

type CreateCategoryData = z.infer<typeof createCategorySchema>;
type UpdateCategoryData = z.infer<typeof updateCategorySchema>;

export async function getCategoriesByUser(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId: string, data: CreateCategoryData) {
  return prisma.category.create({
    data: { ...data, userId },
  });
}

export async function updateCategory(userId: string, categoryId: string, data: UpdateCategoryData) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) return null;
  return prisma.category.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(userId: string, categoryId: string) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const txCount = await tx.transaction.count({ where: { categoryId } });
    if (txCount > 0) {
      const error = Object.assign(
        new Error('No se puede eliminar una categoría con transacciones asociadas'),
        { status: 400 }
      );
      throw error;
    }
    return tx.category.delete({ where: { id: categoryId } });
  });
}
