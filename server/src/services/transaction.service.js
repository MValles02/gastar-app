export function getBalanceDelta(type, amount) {
  switch (type) {
    case 'income': return amount;
    case 'expense': return -amount;
    case 'transfer': return -amount;
    default: return 0;
  }
}

export async function adjustBalance(tx, accountId, nativeDelta, arsDelta) {
  await tx.account.update({
    where: { id: accountId },
    data: {
      balance: { increment: nativeDelta },
      balanceArs: { increment: arsDelta },
    },
  });
}

export async function applyTransactionBalances(tx, transaction, sourceAccount, destAccount = null) {
  const amount = Number(transaction.amount);
  const amountArs = Number(transaction.amountArs);
  const nativeDelta = getBalanceDelta(transaction.type, amount);
  const arsDelta = getBalanceDelta(transaction.type, amountArs);

  await adjustBalance(tx, transaction.accountId, nativeDelta, arsDelta);

  if (transaction.type === 'transfer' && transaction.transferTo && destAccount) {
    // Credit destination in its native units: same amount if same currency, ARS equivalent if cross-currency
    const destNativeCredit = destAccount.currency === sourceAccount.currency ? amount : amountArs;
    await adjustBalance(tx, transaction.transferTo, destNativeCredit, amountArs);
  }
}

export async function reverseTransactionBalances(tx, transaction, sourceAccount, destAccount = null) {
  const amount = Number(transaction.amount);
  const amountArs = Number(transaction.amountArs);
  const nativeDelta = getBalanceDelta(transaction.type, amount);
  const arsDelta = getBalanceDelta(transaction.type, amountArs);

  await adjustBalance(tx, transaction.accountId, -nativeDelta, -arsDelta);

  if (transaction.type === 'transfer' && transaction.transferTo && destAccount) {
    const destNativeCredit = destAccount.currency === sourceAccount.currency ? amount : amountArs;
    await adjustBalance(tx, transaction.transferTo, -destNativeCredit, -amountArs);
  }
}
