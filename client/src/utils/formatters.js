import { accountTypeLabels } from '../constants/accountTypes.js';

const locale = navigator.language;

const currencyFormatters = {};
function getCurrencyFormatter(currency) {
  if (!currencyFormatters[currency]) {
    currencyFormatters[currency] = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
  }
  return currencyFormatters[currency];
}

export function formatCurrency(amount, currency = 'ARS') {
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

export function formatDate(dateString) {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateFormatter.format(date);
}

export function formatDateShort(dateString) {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateShortFormatter.format(date);
}

export function getAccountTypeLabel(type) {
  return accountTypeLabels[type] || type;
}

const transactionTypeLabels = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

export function getTransactionTypeLabel(type) {
  return transactionTypeLabels[type] || type;
}

export function getTransactionTypeColor(type) {
  const colors = {
    income: 'green',
    expense: 'red',
    transfer: 'blue',
  };
  return colors[type] || 'gray';
}

export function getAmountTone(type) {
  if (type === 'income') return 'text-success';
  if (type === 'expense') return 'text-danger';
  if (type === 'transfer') return 'text-accent-600 dark:text-accent-300';
  return 'text-app';
}

export function getBalanceTone(amount) {
  return amount >= 0 ? 'text-app' : 'text-danger';
}
