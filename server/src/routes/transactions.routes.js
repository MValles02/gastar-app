import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../utils/prisma.js';
import { createTransactionSchema, updateTransactionSchema, transactionQuerySchema } from '../validators/transaction.validators.js';
import { applyTransactionBalances, reverseTransactionBalances } from '../services/transaction.service.js';

const router = Router();

router.use(authenticate);

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const query = transactionQuerySchema.parse(req.query);
    const where = {
      account: { userId: req.userId },
    };
    if (query.accountId) where.accountId = query.accountId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true } },
          account: { select: { id: true, name: true } },
          transferToAccount: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      data: {
        transactions,
        total,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: req.userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    if (data.transferTo) {
      const destAccount = await prisma.account.findFirst({
        where: { id: data.transferTo, userId: req.userId },
      });
      if (!destAccount) {
        return res.status(404).json({ error: 'Cuenta destino no encontrada' });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description: data.description || null,
          date: new Date(data.date),
          transferTo: data.transferTo || null,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          account: { select: { id: true, name: true } },
          transferToAccount: { select: { id: true, name: true } },
        },
      });
      await applyTransactionBalances(tx, created);
      return created;
    });

    res.status(201).json({ data: transaction });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateTransactionSchema.parse(req.body);

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, account: { userId: req.userId } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      await reverseTransactionBalances(tx, existing);
      const updated = await tx.transaction.update({
        where: { id: req.params.id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          account: { select: { id: true, name: true } },
          transferToAccount: { select: { id: true, name: true } },
        },
      });
      await applyTransactionBalances(tx, updated);
      return updated;
    });

    res.json({ data: transaction });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, account: { userId: req.userId } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      await reverseTransactionBalances(tx, existing);
      await tx.transaction.delete({ where: { id: req.params.id } });
    });

    res.json({ data: { message: 'Transacción eliminada' } });
  } catch (err) {
    next(err);
  }
});

export default router;
