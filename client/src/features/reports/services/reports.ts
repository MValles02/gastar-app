import api from '../../../shared/services/api.js';

export interface ReportParams {
  from?: string;
  to?: string;
  year?: string | number;
  accountId?: string | string[];
  type?: string | string[];
  categoryId?: string | string[];
}

export interface SummaryData {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netFlow?: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    arsBalance: number;
    currency: string;
  }>;
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  total: number;
}

export interface ByCategoryData {
  expenses: CategoryReportItem[];
  incomes: CategoryReportItem[];
}

export interface MonthRow {
  month: number;
  income: number;
  expenses: number;
  netFlow: number;
}

export interface MonthlyData {
  months: MonthRow[];
  totals: { income: number; expenses: number; netFlow: number };
}

export interface FrequencyItem {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  count: number;
}

export async function getSummary(params: ReportParams = {}): Promise<SummaryData> {
  const res = await api.get('/reports/summary', { params });
  return res.data.data;
}

export async function getByCategory(params: ReportParams = {}): Promise<ByCategoryData> {
  const res = await api.get('/reports/by-category', { params });
  return res.data.data;
}

export async function getMonthly(params: ReportParams = {}): Promise<MonthlyData> {
  const res = await api.get('/reports/monthly', { params });
  return res.data.data;
}

export async function getFrequency(params: ReportParams = {}): Promise<FrequencyItem[]> {
  const res = await api.get('/reports/frequency', { params });
  return res.data.data;
}
