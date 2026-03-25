export const accountTypeOptions = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversión' },
];

export const accountTypeLabels = Object.fromEntries(
  accountTypeOptions.map(option => [option.value, option.label])
);
