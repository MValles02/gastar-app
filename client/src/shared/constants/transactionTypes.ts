import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, type LucideIcon } from 'lucide-react';
import type { TransactionType } from '../types/domain.types.js';

export interface TypeConfig {
  Icon: LucideIcon;
  tone: string;
}

export interface TypeOption {
  value: TransactionType;
  label: string;
  icon: LucideIcon;
  tone: string;
}

export interface TypeFilterOption {
  value: TransactionType;
  label: string;
}

export const TYPE_CONFIG: Record<TransactionType, TypeConfig> = {
  income: { Icon: ArrowUpCircle, tone: 'text-success' },
  expense: { Icon: ArrowDownCircle, tone: 'text-danger' },
  transfer: { Icon: ArrowLeftRight, tone: 'text-accent-600 dark:text-accent-300' },
};

export const typeOptions: TypeOption[] = [
  { value: 'expense', label: 'Gasto', icon: ArrowDownCircle, tone: 'text-danger' },
  { value: 'income', label: 'Ingreso', icon: ArrowUpCircle, tone: 'text-success' },
  {
    value: 'transfer',
    label: 'Transferencia',
    icon: ArrowLeftRight,
    tone: 'text-accent-600 dark:text-accent-300',
  },
];

export const typeFilterOptions: TypeFilterOption[] = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'transfer', label: 'Transferencia' },
];

export function amountPrefix(type: TransactionType | string): string {
  if (type === 'income') return '+';
  if (type === 'expense') return '-';
  return '';
}
