import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from './transaction.validators.js';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
} from './transaction.service.js';

const router = Router();

router.use(authenticate);

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const query = transactionQuerySchema.parse(req.query);
    const result = await listTransactions(req.userId, query);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    const transaction = await createTransaction(req.userId, data);
    res.status(201).json({ data: transaction });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateTransactionSchema.parse(req.body);
    const transaction = await updateTransaction(req.params.id, req.userId, data);
    res.json({ data: transaction });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTransaction(req.params.id, req.userId);
    res.json({ data: { message: 'Transaction deleted' } });
  } catch (err) {
    next(err);
  }
});

export default router;
