import { useCallback, useEffect, useState } from 'react';
import { getSummary, getByCategory } from '../../reports/services/reports.js';
import { getTransactions } from '../../transactions/services/transactions.js';
import { Page, Section } from '../../../shared/components/layout/Page.js';
import BalanceOverview from '../components/BalanceOverview.js';
import ActiveAccounts from '../components/ActiveAccounts.js';
import RecentTransactions from '../components/RecentTransactions.js';
import SpendingByCategory from '../components/SpendingByCategory.js';
import { DashboardSkeleton } from '../../../shared/components/ui/PageSkeletons.js';
import PageErrorState from '../../../shared/components/ui/PageErrorState.js';
import { useTransactionModal } from '../../../shared/contexts/TransactionModalContext.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import type { SummaryData, ByCategoryData } from '../../reports/services/reports.js';
import type { TransactionWithRelations } from '../../transactions/services/transactions.js';
import type { Account } from '../../../shared/types/domain.types.js';

function Dashboard(): JSX.Element {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [categoryData, setCategoryData] = useState<ByCategoryData | null>(null);
  const [recentTx, setRecentTx] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { refreshKey } = useTransactionModal();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];

      const [sum, byCat, txData] = await Promise.all([
        getSummary({ from, to }),
        getByCategory({ from, to }),
        getTransactions({ limit: 8 }),
      ]);

      setSummary(sum);
      setCategoryData(byCat);
      setRecentTx(txData.transactions);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos cargar el panel de control.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Compute net amounts per category (expenses minus incomes)
  const netByCategory = (() => {
    const expenses = categoryData?.expenses ?? [];
    const incomes = categoryData?.incomes ?? [];
    const incomeMap = new Map(incomes.map((i) => [i.categoryId, i.total]));
    return expenses
      .map((e) => ({ ...e, total: e.total - (incomeMap.get(e.categoryId) ?? 0) }))
      .filter((e) => e.total > 0);
  })();

  if (loading) return <DashboardSkeleton />;
  if (error)
    return <PageErrorState title="No pudimos cargar el panel" message={error} onAction={load} />;

  return (
    <Page>
      <Section className="space-y-8">
        <BalanceOverview summary={summary} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActiveAccounts accounts={(summary?.accounts ?? []) as Account[]} />
          <RecentTransactions transactions={recentTx} />
        </div>

        <SpendingByCategory data={netByCategory} />
      </Section>
    </Page>
  );
}

export default Dashboard;
