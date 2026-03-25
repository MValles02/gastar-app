import { Router } from 'express';
import { z } from 'zod';
import { getExchangeRates } from '../services/exchange-rate.service.js';

const router = Router();

const querySchema = z.object({
  currency: z.enum(['USD', 'EUR']),
});

// GET /api/exchange-rates?currency=USD|EUR
router.get('/', async (req, res, next) => {
  try {
    const { currency } = querySchema.parse(req.query);
    const rates = await getExchangeRates(currency);
    res.json({ data: { currency, blue: rates.blue, oficial: rates.oficial } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Moneda inválida. Usá USD o EUR.' });
    }
    next(err);
  }
});

export default router;
