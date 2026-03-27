export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type Currency = 'ARS' | 'USD' | 'EUR';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  cotizacionPreference: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  balanceArs: number;
  currency: Currency;
  createdAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon?: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  cotizacion?: number | null;
  amountArs: number;
  description?: string | null;
  date: Date;
  transferTo?: string | null;
  createdAt: Date;
}

export interface ExchangeRate {
  usd: number;
  eur: number;
  source: string;
  timestamp: number;
}

export interface SummaryReport {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface ByCategoryReport {
  categoryId: string | null;
  categoryName: string | null;
  total: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  income: number;
  expenses: number;
}

export interface FrequencyItem {
  description: string;
  count: number;
  total: number;
}

export interface ByCategoryFilters {
  from?: string;
  to?: string;
  type?: TransactionType;
}
