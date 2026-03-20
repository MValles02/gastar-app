import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/transactions?account_id=&category_id=&from=&to=
router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
