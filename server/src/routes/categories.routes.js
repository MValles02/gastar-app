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
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
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
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
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
      return res.status(404).json({ error: 'Categoria no encontrada' });
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: category });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
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
      return res.status(404).json({ error: 'Categoria no encontrada' });
    }
    const txCount = await prisma.transaction.count({
      where: { categoryId: req.params.id },
    });
    if (txCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una categoria con transacciones asociadas' });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Categoria eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
