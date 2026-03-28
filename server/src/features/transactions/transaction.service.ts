import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../shared/utils/prisma.js';
import { getEffectiveTransaction } from './transaction-rules.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type TransactionType = 'income' | 'expense' | 'transfer';

interface TransactionLike {
  accountId: string;
  type: string;
  amount: number | Decimal;
  arsAmount: number | Decimal;
  transferTo: string | null;
}

interface AccountLike {
  id: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// Balance math helpers (private to this module)
// ---------------------------------------------------------------------------

function getBalanceDelta(type: TransactionType | string, amount: number): number {
  switch (type) {
    case 'income':
      return amount;
    case 'expense':
      return -amount;
    case 'transfer':
      return -amount;
    default:
      return 0;
  }
}

async function adjustBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
  nativeDelta: number,
  arsDelta: number
): Promise<void> {
  await tx.account.update({
    where: { id: accountId },
    data: {
      balance: { increment: nativeDelta },
      arsBalance: { increment: arsDelta },
    },
  });
}

export async function applyTransactionBalances(
  tx: Prisma.TransactionClient,
  transaction: TransactionLike,
  sourceAccount: AccountLike,
  destAccount: AccountLike | null = null
): Promise<void> {
  const amount = Number(transaction.amount);
  const arsAmount = Number(transaction.arsAmount);
  const nativeDelta = getBalanceDelta(transaction.type, amount);
  const arsDelta = getBalanceDelta(transaction.type, arsAmount);

  await adjustBalance(tx, transaction.accountId, nativeDelta, arsDelta);

  if (transaction.type === 'transfer' && transaction.transferTo && destAccount) {
    const destNativeCredit = destAccount.currency === sourceAccount.currency ? amount : arsAmount;
    await adjustBalance(tx, transaction.transferTo, destNativeCredit, arsAmount);
  }
}

export async function reverseTransactionBalances(
  tx: Prisma.TransactionClient,
  transaction: TransactionLike,
  sourceAccount: AccountLike,
  destAccount: AccountLike | null = null
): Promise<void> {
  const amount = Number(transaction.amount);
  const arsAmount = Number(transaction.arsAmount);
  const nativeDelta = getBalanceDelta(transaction.type, amount);
  const arsDelta = getBalanceDelta(transaction.type, arsAmount);

  await adjustBalance(tx, transaction.accountId, -nativeDelta, -arsDelta);

  if (transaction.type === 'transfer' && transaction.transferTo && destAccount) {
    const destNativeCredit = destAccount.currency === sourceAccount.currency ? amount : arsAmount;
    await adjustBalance(tx, transaction.transferTo, -destNativeCredit, -arsAmount);
  }
}

// ---------------------------------------------------------------------------
// Ownership validation helpers
// ---------------------------------------------------------------------------

async function fetchOwnedAccount(
  accountId: string,
  userId: string,
  errorMessage: string
): Promise<AccountLike> {
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
): Promise<{ sourceAccount: AccountLike; destAccount: AccountLike | null }> {
  const sourceAccount = await fetchOwnedAccount(data.accountId, userId, 'Account not found');
  await assertOwnedCategory(data.categoryId, userId);

  let destAccount: AccountLike | null = null;
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

// ---------------------------------------------------------------------------
// Transaction include shape (shared across service functions)
// ---------------------------------------------------------------------------

const transactionInclude = {
  category: { select: { id: true, name: true, icon: true } },
  account: { select: { id: true, name: true } },
  transferToAccount: { select: { id: true, name: true } },
} satisfies Prisma.TransactionInclude;

// ---------------------------------------------------------------------------
// Public service input types
// ---------------------------------------------------------------------------

export interface CreateTransactionInput {
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  exchangeRate?: number;
  description?: string;
  date: string;
  transferTo?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  amount?: number;
  exchangeRate?: number;
  description?: string | null;
  date?: string;
  transferTo?: string | null;
}

export interface ListTransactionsInput {
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function createTransaction(userId: string, data: CreateTransactionInput) {
  const { sourceAccount, destAccount } = await validateTransactionReferences(data, userId);

  if (sourceAccount.currency !== 'ARS' && !data.exchangeRate) {
    const error = Object.assign(
      new Error('Exchange rate is required for foreign currency accounts'),
      { status: 400 }
    );
    throw error;
  }

  const exchangeRate = sourceAccount.currency === 'ARS' ? null : (data.exchangeRate ?? null);
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
        transferTo: data.type === 'transfer' ? (data.transferTo ?? null) : null,
      },
      include: transactionInclude,
    });
    await applyTransactionBalances(tx, created, sourceAccount, destAccount);
    return created;
  });

  return transaction;
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  data: UpdateTransactionInput
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, account: { userId } },
  });
  if (!existing) {
    const error = Object.assign(new Error('Transaction not found'), { status: 404 });
    throw error;
  }

  const updatePayload: UpdateTransactionInput & { arsAmount?: number } = { ...data };

  // Recompute arsAmount if amount or exchangeRate changed
  if (data.amount !== undefined || data.exchangeRate !== undefined) {
    const effectiveAmount = data.amount ?? Number(existing.amount);
    const effectiveExchangeRate =
      data.exchangeRate !== undefined
        ? data.exchangeRate
        : existing.exchangeRate
          ? Number(existing.exchangeRate)
          : null;
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
    userId
  );

  if (sourceAccount.currency !== 'ARS' && !effectiveData.exchangeRate) {
    const error = Object.assign(
      new Error('Exchange rate is required for foreign currency accounts'),
      { status: 400 }
    );
    throw error;
  }

  const existingSourceAccount = await fetchOwnedAccount(
    existing.accountId,
    userId,
    'Account not found'
  );
  const existingDestAccount = existing.transferTo
    ? await fetchOwnedAccount(existing.transferTo, userId, 'Destination account not found')
    : null;

  const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await reverseTransactionBalances(tx, existing, existingSourceAccount, existingDestAccount);
    const updated = await tx.transaction.update({
      where: { id: transactionId },
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
      include: transactionInclude,
    });
    await applyTransactionBalances(tx, updated, sourceAccount, destAccount);
    return updated;
  });

  return transaction;
}

export async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, account: { userId } },
  });
  if (!existing) {
    const error = Object.assign(new Error('Transaction not found'), { status: 404 });
    throw error;
  }

  const sourceAccount = await fetchOwnedAccount(existing.accountId, userId, 'Account not found');
  const destAccount = existing.transferTo
    ? await fetchOwnedAccount(existing.transferTo, userId, 'Destination account not found')
    : null;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await reverseTransactionBalances(tx, existing, sourceAccount, destAccount);
    await tx.transaction.delete({ where: { id: transactionId } });
  });
}

export async function listTransactions(userId: string, query: ListTransactionsInput) {
  const where: Prisma.TransactionWhereInput = {
    account: { userId },
  };

  if (query.accountId) where.accountId = query.accountId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.type) where.type = query.type;
  if (query.from || query.to) {
    const dateFilter: Prisma.DateTimeFilter<'Transaction'> = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    where.date = dateFilter;
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page: query.page,
    totalPages: Math.ceil(total / query.limit),
  };
}
