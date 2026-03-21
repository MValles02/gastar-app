import { useCallback, useEffect, useState } from 'react';
import { getSummary, getByCategory } from '../services/reports.js';
import { getTransactions } from '../services/transactions.js';
import { Page, PageHeader, Section } from '../components/layout/Page.jsx';
import BalanceOverview from '../components/dashboard/BalanceOverview.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import Spinner from '../components/ui/Spinner.jsx';
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

  if (loading) return <Spinner className="py-12" />;
  if (error) return <PageErrorState title="No pudimos cargar el panel" message={error} onAction={load} />;

  return (
    <Page>
      <PageHeader
        title="Panel de control"
        description="Seguimiento rápido de balances, últimas transacciones y distribución de gastos."
      />
      <Section className="space-y-6">
        <BalanceOverview summary={summary} />

        <div className="grid gap-6 lg:grid-cols-2">
          <SpendingByCategory expenses={categoryData?.expenses} />
          <RecentTransactions transactions={recentTx} />
        </div>
      </Section>
    </Page>
  );
}

export default Dashboard;
