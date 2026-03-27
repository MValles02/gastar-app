import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from 'lucide-react';

export const TYPE_CONFIG = {
  income: { Icon: ArrowUpCircle, tone: 'text-success' },
  expense: { Icon: ArrowDownCircle, tone: 'text-danger' },
  transfer: { Icon: ArrowLeftRight, tone: 'text-accent-600 dark:text-accent-300' },
};

export const typeOptions = [
  { value: 'expense', label: 'Gasto', icon: ArrowDownCircle, tone: 'text-danger' },
  { value: 'income', label: 'Ingreso', icon: ArrowUpCircle, tone: 'text-success' },
  {
    value: 'transfer',
    label: 'Transferencia',
    icon: ArrowLeftRight,
    tone: 'text-accent-600 dark:text-accent-300',
  },
];

export const typeFilterOptions = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'transfer', label: 'Transferencia' },
];

export function amountPrefix(type) {
  if (type === 'income') return '+';
  if (type === 'expense') return '-';
  return '';
}
