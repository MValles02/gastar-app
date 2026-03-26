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
    const currency = data.currency || 'ARS';
    const balanceArs = currency === 'ARS'
      ? data.balance
      : data.cotizacion ? Number(data.balance) * data.cotizacion : 0;
    const account = await prisma.account.create({
      data: { name: data.name, type: data.type, currency, balance: data.balance, balanceArs, userId: req.userId },
    });
    res.status(201).json({ data: account });
  } catch (err) {
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

    const { cotizacion, ...updatePayload } = data;
    const incomingCurrency = updatePayload.currency ?? existing.currency;
    const currencyChanging = updatePayload.currency && updatePayload.currency !== existing.currency;

    if (currencyChanging) {
      if (incomingCurrency === 'ARS') {
        updatePayload.balanceArs = Number(existing.balance);
      } else {
        updatePayload.balanceArs = Number(existing.balance) * cotizacion;
      }
    }

    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: updatePayload,
    });
    res.json({ data: account });
  } catch (err) {
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
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Cuenta eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
