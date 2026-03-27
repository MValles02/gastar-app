import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { createAccountSchema, updateAccountSchema } from './accounts.validators.js';
import {
  getAccountsByUser,
  createAccount,
  updateAccount,
  deleteAccount,
  getTransactionCountForAccount,
} from './accounts.service.js';

const router = Router();
router.use(authenticate);

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await getAccountsByUser(req.userId);
    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const account = await createAccount(req.userId, data);
    res.status(201).json({ data: account });
  } catch (err) {
    next(err);
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateAccountSchema.parse(req.body);
    const account = await updateAccount(req.userId, req.params.id, data);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const txCount = await getTransactionCountForAccount(req.params.id);
    if (txCount > 0) {
      return res.status(400).json({ error: `Esta cuenta tiene ${txCount} transacciones asociadas.` });
    }
    const result = await deleteAccount(req.userId, req.params.id);
    if (!result) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: { message: 'Cuenta eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
