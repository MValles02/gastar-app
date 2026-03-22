import { useCallback, useEffect, useState } from 'react';
import { getSummary, getByCategory } from '../services/reports.js';
import { getTransactions } from '../services/transactions.js';
import { Page, PageHeader, Section } from '../components/layout/Page.jsx';
import BalanceOverview from '../components/dashboard/BalanceOverview.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import { DashboardSkeleton } from '../components/ui/PageSkeletons.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { getErrorMessage } from '../utils/errors.js';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
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
    load();
  }, [load, refreshKey]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <PageErrorState title="No pudimos cargar el panel" message={error} onAction={load} />;

  return (
    <Page>
      <PageHeader
        eyebrow="Vista general"
        title="Panel de control"
        description="Balances, distribución del gasto y últimos movimientos en una sola superficie de lectura rápida."
      />

      <Section className="space-y-8">
        <BalanceOverview summary={summary} />

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <SpendingByCategory expenses={categoryData?.expenses} />
          <RecentTransactions transactions={recentTx} />
        </div>
      </Section>
    </Page>
  );
}

export default Dashboard;
