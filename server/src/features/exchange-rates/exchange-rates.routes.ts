import { Router } from 'express';
import { z } from 'zod';
import { getExchangeRates } from './exchange-rate.service.js';

const router = Router();

const querySchema = z.object({
  currency: z.enum(['USD', 'EUR']),
});

// GET /api/exchange-rates?currency=USD|EUR
router.get('/', async (req, res, next) => {
  try {
    const { currency } = querySchema.parse(req.query);
    const rates = await getExchangeRates(currency);
    res.json({ data: { currency, blue: rates.blue, official: rates.official } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid currency. Use USD or EUR.' });
      return;
    }
    next(err);
  }
});

export default router;
