import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { reportQuerySchema, monthlyQuerySchema, byCategoryQuerySchema } from './reports.validators.js';
import { getSummaryReport, getByCategoryReport, getMonthlyReport, getFrequencyReport } from './reports.service.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const { from, to } = reportQuerySchema.parse(req.query);
    const data = await getSummaryReport(req.userId, { from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/by-category', async (req, res, next) => {
  try {
    const filters = byCategoryQuerySchema.parse(req.query);
    const data = await getByCategoryReport(req.userId, filters);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const { year } = monthlyQuerySchema.parse(req.query);
    const data = await getMonthlyReport(req.userId, { year });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/frequency', async (req, res, next) => {
  try {
    const { from, to } = reportQuerySchema.parse(req.query);
    const data = await getFrequencyReport(req.userId, { from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
