import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/reports/summary?from=&to=
router.get('/summary', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/by-category?from=&to=
router.get('/by-category', async (req, res, next) => {
  try {
    res.json({ message: 'TODO' });
  } catch (err) {
    next(err);
  }
});

export default router;
