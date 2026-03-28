import prisma from '../../shared/utils/prisma.js';
import type { z } from 'zod';
import type { createAccountSchema, updateAccountSchema } from './accounts.validators.js';

type CreateAccountData = z.infer<typeof createAccountSchema>;
type UpdateAccountData = z.infer<typeof updateAccountSchema>;

export async function getAccountsByUser(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function createAccount(userId: string, data: CreateAccountData) {
  const currency = data.currency ?? 'ARS';
  const arsBalance =
    currency === 'ARS'
      ? data.balance
      : data.exchangeRate
        ? Number(data.balance) * data.exchangeRate
        : 0;
  return prisma.account.create({
    data: { name: data.name, type: data.type, currency, balance: data.balance, arsBalance, userId },
  });
}

export async function updateAccount(userId: string, accountId: string, data: UpdateAccountData) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) return null;

  const { exchangeRate, ...updatePayload } = data;
  const incomingCurrency = updatePayload.currency ?? existing.currency;
  const currencyChanging =
    updatePayload.currency !== undefined && updatePayload.currency !== existing.currency;

  const shouldRecalc =
    currencyChanging || (exchangeRate !== undefined && incomingCurrency !== 'ARS');
  const payload: Record<string, unknown> = { ...updatePayload };

  if (shouldRecalc) {
    if (incomingCurrency === 'ARS') {
      payload.arsBalance = Number(existing.balance);
    } else {
      payload.arsBalance = Number(existing.balance) * (exchangeRate ?? 1);
    }
  }

  return prisma.account.update({ where: { id: accountId }, data: payload });
}

export async function deleteAccount(userId: string, accountId: string): Promise<true | null> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) return null;
  await prisma.account.delete({ where: { id: accountId } });
  return true;
}

export async function getTransactionCountForAccount(
  accountId: string,
  userId: string
): Promise<number> {
  return prisma.transaction.count({ where: { accountId, account: { userId } } });
}

/**
 * Atomically checks that an account has no transactions, then deletes it.
 * Returns null if the account was not found (or doesn't belong to userId).
 * Returns { txCount } if the account has transactions (caller should reject).
 * Returns true on success.
 */
export async function deleteAccountAtomic(
  userId: string,
  accountId: string
): Promise<true | { txCount: number } | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.account.findFirst({ where: { id: accountId, userId } });
    if (!existing) return null;

    const txCount = await tx.transaction.count({
      where: { accountId, account: { userId } },
    });
    if (txCount > 0) return { txCount };

    await tx.account.delete({ where: { id: accountId } });
    return true;
  });
}
