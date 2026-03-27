import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { createCategorySchema, updateCategorySchema } from './categories.validators.js';
import { getCategoriesByUser, createCategory, updateCategory, deleteCategory } from './categories.service.js';

const router = Router();
router.use(authenticate);

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await getCategoriesByUser(req.userId);
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await createCategory(req.userId, data);
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await updateCategory(req.userId, req.params.id, data);
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ data: category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteCategory(req.userId, req.params.id);
    if (!result) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ data: { message: 'Categoría eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
