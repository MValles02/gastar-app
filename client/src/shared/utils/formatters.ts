import { accountTypeLabels } from '../constants/accountTypes.js';
import type { TransactionType, Currency } from '../types/domain.types.js';

const locale = navigator.language;

const currencyFormatters: Record<string, Intl.NumberFormat> = {};
function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!currencyFormatters[currency]) {
    currencyFormatters[currency] = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
  }
  return currencyFormatters[currency];
}

export function formatCurrency(amount: number | string, currency: Currency | string = 'ARS'): string {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  return getCurrencyFormatter(currency).format(num);
}

const dateFormatter = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateShortFormatter = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
});

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateFormatter.format(date);
}

export function formatDateShort(dateString: string): string {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateShortFormatter.format(date);
}

export function getAccountTypeLabel(type: string): string {
  return accountTypeLabels[type] || type;
}

const transactionTypeLabels: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

export function getTransactionTypeLabel(type: string): string {
  return transactionTypeLabels[type] || type;
}

export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    income: 'green',
    expense: 'red',
    transfer: 'blue',
  };
  return colors[type] || 'gray';
}

export function getAmountTone(type: TransactionType | string): string {
  if (type === 'income') return 'text-success';
  if (type === 'expense') return 'text-danger';
  if (type === 'transfer') return 'text-accent-600 dark:text-accent-300';
  return 'text-app';
}

export function getBalanceTone(amount: number): string {
  return amount >= 0 ? 'text-app' : 'text-danger';
}
