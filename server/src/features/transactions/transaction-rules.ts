import type { Decimal } from '@prisma/client/runtime/library';

interface ExistingTransaction {
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: number | Decimal;
  cotizacion: number | Decimal | null;
  amountArs: number | Decimal;
  description: string | null;
  date: Date;
  transferTo: string | null;
}

interface UpdateData {
  accountId?: string;
  categoryId?: string | null;
  type?: string;
  amount?: number;
  cotizacion?: number | null;
  amountArs?: number;
  description?: string | null;
  date?: string;
  transferTo?: string | null;
}

export interface EffectiveTransaction {
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: number | Decimal;
  cotizacion: number | Decimal | null;
  amountArs: number | Decimal;
  description: string | null;
  date: Date | string;
  transferTo: string | null;
}

export function getEffectiveTransaction(
  existing: ExistingTransaction,
  data: UpdateData
): EffectiveTransaction {
  const effective: EffectiveTransaction = {
    accountId: data.accountId ?? existing.accountId,
    categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
    type: data.type ?? existing.type,
    amount: data.amount ?? existing.amount,
    cotizacion: data.cotizacion !== undefined ? data.cotizacion : existing.cotizacion,
    amountArs: data.amountArs ?? existing.amountArs,
    description: data.description !== undefined ? data.description : existing.description,
    date: data.date ?? existing.date,
    transferTo: data.transferTo === undefined ? existing.transferTo : data.transferTo,
  };

  if (effective.type === 'transfer') return effective;

  effective.transferTo = null;

  return effective;
}
