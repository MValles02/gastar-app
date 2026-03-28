import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { createAccountSchema, updateAccountSchema } from './accounts.validators.js';
import {
  getAccountsByUser,
  createAccount,
  updateAccount,
  deleteAccountAtomic,
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
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteAccountAtomic(req.userId, req.params.id);
    if (result === null) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    if (result !== true) {
      res
        .status(400)
        .json({ error: `This account has ${result.txCount} associated transactions.` });
      return;
    }
    res.json({ data: { message: 'Account deleted' } });
  } catch (err) {
    next(err);
  }
});

export default router;
