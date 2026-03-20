import prisma from '../utils/prisma.js';

export function getBalanceDelta(type, amount) {
  switch (type) {
    case 'income': return amount;
    case 'expense': return -amount;
    case 'transfer': return -amount;
    default: return 0;
  }
}

export async function adjustBalance(tx, accountId, delta) {
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { increment: delta } },
  });
}

export async function applyTransactionBalances(tx, transaction) {
  const amount = parseFloat(transaction.amount);
  const delta = getBalanceDelta(transaction.type, amount);
  await adjustBalance(tx, transaction.accountId, delta);
  if (transaction.type === 'transfer' && transaction.transferTo) {
    await adjustBalance(tx, transaction.transferTo, amount);
  }
}

export async function reverseTransactionBalances(tx, transaction) {
  const amount = parseFloat(transaction.amount);
  const delta = getBalanceDelta(transaction.type, amount);
  await adjustBalance(tx, transaction.accountId, -delta);
  if (transaction.type === 'transfer' && transaction.transferTo) {
    await adjustBalance(tx, transaction.transferTo, -amount);
  }
}
