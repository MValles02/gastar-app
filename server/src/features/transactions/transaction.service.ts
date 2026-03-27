import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

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

export function getBalanceDelta(type: TransactionType | string, amount: number): number {
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

export async function adjustBalance(
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
