import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../utils/prisma.js';
import { createAccountSchema, updateAccountSchema } from '../validators/account.validators.js';

const router = Router();

router.use(authenticate);

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    });
    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const account = await prisma.account.create({
      data: { name: data.name, type: data.type, currency: data.currency, balance: data.balance, userId: req.userId },
    });
    res.status(201).json({ data: account });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateAccountSchema.parse(req.body);
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: account });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    const txCount = await prisma.transaction.count({
      where: { accountId: req.params.id },
    });
    if (txCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una cuenta con transacciones asociadas' });
    }
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Cuenta eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
