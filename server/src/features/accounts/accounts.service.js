import prisma from '../../shared/utils/prisma.js';

export async function getAccountsByUser(userId) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function createAccount(userId, data) {
  const currency = data.currency || 'ARS';
  const balanceArs =
    currency === 'ARS' ? data.balance : data.cotizacion ? Number(data.balance) * data.cotizacion : 0;
  return prisma.account.create({
    data: { name: data.name, type: data.type, currency, balance: data.balance, balanceArs, userId },
  });
}

export async function updateAccount(userId, accountId, data) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) return null;

  const { cotizacion, ...updatePayload } = data;
  const incomingCurrency = updatePayload.currency ?? existing.currency;
  const currencyChanging = updatePayload.currency && updatePayload.currency !== existing.currency;

  const shouldRecalc = currencyChanging || (cotizacion && incomingCurrency !== 'ARS');
  if (shouldRecalc) {
    if (incomingCurrency === 'ARS') {
      updatePayload.balanceArs = Number(existing.balance);
    } else {
      updatePayload.balanceArs = Number(existing.balance) * cotizacion;
    }
  }

  return prisma.account.update({ where: { id: accountId }, data: updatePayload });
}

export async function deleteAccount(userId, accountId) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) return null;
  await prisma.account.delete({ where: { id: accountId } });
  return true;
}

export async function getTransactionCountForAccount(accountId) {
  return prisma.transaction.count({ where: { accountId } });
}
