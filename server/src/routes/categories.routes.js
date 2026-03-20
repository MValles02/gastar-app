import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
