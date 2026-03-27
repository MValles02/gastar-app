import type { AccountType } from '../types/domain.types.js';

export interface AccountTypeOption {
  value: AccountType;
  label: string;
}

export const accountTypeOptions: AccountTypeOption[] = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversión' },
];

export const accountTypeLabels: Record<string, string> = Object.fromEntries(
  accountTypeOptions.map((option) => [option.value, option.label])
);
