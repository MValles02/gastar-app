import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import prisma from '../../shared/utils/prisma.js';
import type { Prisma } from '@prisma/client';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from './transaction.validators.js';
import { applyTransactionBalances, reverseTransactionBalances } from './transaction.service.js';
import { getEffectiveTransaction } from './transaction-rules.js';

const router = Router();

router.use(authenticate);

interface OwnedAccount {
  id: string;
  currency: string;
}

async function fetchOwnedAccount(
  accountId: string,
  userId: string,
  errorMessage: string
): Promise<OwnedAccount> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, currency: true },
  });

  if (!account) {
    const error = Object.assign(new Error(errorMessage), { status: 404 });
    throw error;
  }

  return account;
}

async function assertOwnedCategory(categoryId: string, userId: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });

  if (!category) {
    const error = Object.assign(new Error('Category not found'), { status: 404 });
    throw error;
  }
}

async function validateTransactionReferences(
  data: { accountId: string; categoryId: string; type: string; transferTo?: string | null },
  userId: string
): Promise<{ sourceAccount: OwnedAccount; destAccount: OwnedAccount | null }> {
  const sourceAccount = await fetchOwnedAccount(data.accountId, userId, 'Account not found');
  await assertOwnedCategory(data.categoryId, userId);

  let destAccount: OwnedAccount | null = null;
  if (data.type === 'transfer') {
    if (!data.transferTo) {
      const error = Object.assign(new Error('Destination account is required for transfers'), {
        status: 400,
      });
      throw error;
    }

    if (data.transferTo === data.accountId) {
      const error = Object.assign(
        new Error('Destination account must be different from source account'),
        { status: 400 }
      );
      throw error;
    }

    destAccount = await fetchOwnedAccount(data.transferTo, userId, 'Destination account not found');
  }

  return { sourceAccount, destAccount };
}

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const query = transactionQuerySchema.parse(req.query);
    const where: Record<string, unknown> = {
      account: { userId: req.userId },
    };
    if (query.accountId) where.accountId = query.accountId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      const dateFilter: Record<string, Date> = {};
      if (query.from) dateFilter.gte = new Date(query.from);
      if (query.to) dateFilter.lte = new Date(query.to);
      where.date = dateFilter;
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
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    const { sourceAccount, destAccount } = await validateTransactionReferences(data, req.userId);

    if (sourceAccount.currency !== 'ARS' && !data.exchangeRate) {
      res.status(400).json({ error: 'Exchange rate is required for foreign currency accounts' });
      return;
    }
    const exchangeRate = sourceAccount.currency === 'ARS' ? null : data.exchangeRate;
    const arsAmount = exchangeRate ? data.amount * exchangeRate : data.amount;

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.transaction.create({
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          exchangeRate,
          arsAmount,
          description: data.description ?? null,
          date: new Date(data.date),
          transferTo: data.type === 'transfer' ? data.transferTo : null,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          account: { select: { id: true, name: true } },
          transferToAccount: { select: { id: true, name: true } },
        },
      });
      await applyTransactionBalances(tx, created, sourceAccount, destAccount);
      return created;
    });

    res.status(201).json({ data: transaction });
  } catch (err) {
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
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const updatePayload: typeof data & { arsAmount?: number } = { ...data };

    // Recompute arsAmount if amount or exchangeRate changed
    if (data.amount !== undefined || data.exchangeRate !== undefined) {
      const effectiveAmount = data.amount ?? Number(existing.amount);
      const effectiveExchangeRate =
        data.exchangeRate ?? (existing.exchangeRate ? Number(existing.exchangeRate) : null);
      updatePayload.arsAmount = effectiveExchangeRate
        ? effectiveAmount * effectiveExchangeRate
        : effectiveAmount;
    }

    const effectiveData = getEffectiveTransaction(existing, updatePayload);
    const { sourceAccount, destAccount } = await validateTransactionReferences(
      {
        accountId: effectiveData.accountId,
        categoryId: (effectiveData.categoryId ?? existing.categoryId) as string,
        type: effectiveData.type,
        transferTo: effectiveData.transferTo,
      },
      req.userId
    );

    if (sourceAccount.currency !== 'ARS' && !effectiveData.exchangeRate) {
      res.status(400).json({ error: 'Exchange rate is required for foreign currency accounts' });
      return;
    }

    const existingSourceAccount = await fetchOwnedAccount(
      existing.accountId,
      req.userId,
      'Account not found'
    );
    const existingDestAccount = existing.transferTo
      ? await fetchOwnedAccount(existing.transferTo, req.userId, 'Destination account not found')
      : null;

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await reverseTransactionBalances(tx, existing, existingSourceAccount, existingDestAccount);
      const updated = await tx.transaction.update({
        where: { id: req.params.id },
        data: {
          accountId: effectiveData.accountId,
          ...(effectiveData.categoryId !== null && { categoryId: effectiveData.categoryId }),
          type: effectiveData.type as 'income' | 'expense' | 'transfer',
          amount: Number(effectiveData.amount),
          exchangeRate:
            effectiveData.exchangeRate !== null ? Number(effectiveData.exchangeRate) : null,
          arsAmount: Number(effectiveData.arsAmount),
          description: effectiveData.description,
          date: data.date ? new Date(data.date) : undefined,
          transferTo: effectiveData.transferTo,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          account: { select: { id: true, name: true } },
          transferToAccount: { select: { id: true, name: true } },
        },
      });
      await applyTransactionBalances(tx, updated, sourceAccount, destAccount);
      return updated;
    });

    res.json({ data: transaction });
  } catch (err) {
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
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const sourceAccount = await fetchOwnedAccount(
      existing.accountId,
      req.userId,
      'Account not found'
    );
    const destAccount = existing.transferTo
      ? await fetchOwnedAccount(existing.transferTo, req.userId, 'Destination account not found')
      : null;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await reverseTransactionBalances(tx, existing, sourceAccount, destAccount);
      await tx.transaction.delete({ where: { id: req.params.id } });
    });

    res.json({ data: { message: 'Transaction deleted' } });
  } catch (err) {
    next(err);
  }
});

export default router;
