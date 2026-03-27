export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type Currency = 'ARS' | 'USD' | 'EUR';

export interface User {
  id: string;
  email: string;
  name: string;
  exchangeRatePreference: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  arsBalance: number;
  currency: Currency;
  createdAt: string;
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
  exchangeRate?: number | null;
  arsAmount: number;
  description?: string | null;
  date: string;
  transferTo?: string | null;
  createdAt: string;
}

export interface ExchangeRate {
  usd: number;
  eur: number;
}
