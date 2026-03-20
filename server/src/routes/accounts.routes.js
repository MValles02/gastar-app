import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
