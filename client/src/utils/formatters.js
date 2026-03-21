export function formatCurrency(amount, currency = 'ARS') {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString) {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateString) {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

const accountTypeLabels = {
  checking: 'Cuenta corriente',
  savings: 'Caja de ahorro',
  credit_card: 'Tarjeta de crédito',
  cash: 'Efectivo',
  investment: 'Inversión',
};

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
