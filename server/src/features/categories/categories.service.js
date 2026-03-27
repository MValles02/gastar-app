import prisma from '../../shared/utils/prisma.js';

export async function getCategoriesByUser(userId) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId, data) {
  return prisma.category.create({
    data: { ...data, userId },
  });
}

export async function updateCategory(userId, categoryId, data) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) return null;
  return prisma.category.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(userId, categoryId) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    const txCount = await tx.transaction.count({ where: { categoryId } });
    if (txCount > 0) {
      const error = new Error('No se puede eliminar una categoría con transacciones asociadas');
      error.status = 400;
      throw error;
    }
    return tx.category.delete({ where: { id: categoryId } });
  });
}
