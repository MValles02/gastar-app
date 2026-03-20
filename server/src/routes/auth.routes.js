import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    res.status(201).json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
