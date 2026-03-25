import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../utils/prisma.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validators.js';

const router = Router();

router.use(authenticate);

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    });
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: { ...data, userId: req.userId },
    });
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await prisma.$transaction(async (tx) => {
      const txCount = await tx.transaction.count({
        where: { categoryId: req.params.id },
      });
      if (txCount > 0) {
        const error = new Error('No se puede eliminar una categoría con transacciones asociadas');
        error.status = 400;
        throw error;
      }
      await tx.category.delete({ where: { id: req.params.id } });
    });
    res.json({ data: { message: 'Categoría eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
