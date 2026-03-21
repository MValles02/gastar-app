export function getEffectiveTransaction(existing, data) {
  const effective = {
    accountId: data.accountId ?? existing.accountId,
    categoryId: data.categoryId ?? existing.categoryId,
    type: data.type ?? existing.type,
    amount: data.amount ?? existing.amount,
    description: data.description ?? existing.description,
    date: data.date ?? existing.date,
    transferTo: data.transferTo !== undefined ? data.transferTo : existing.transferTo,
  };

  if (effective.type !== 'transfer') {
    effective.transferTo = null;
  }

  return effective;
}
