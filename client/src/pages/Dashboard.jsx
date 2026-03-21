import { useState, useEffect } from 'react';
import { getSummary, getByCategory } from '../services/reports.js';
import { getTransactions } from '../services/transactions.js';
import BalanceOverview from '../components/dashboard/BalanceOverview.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useTransactionModal();

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];

    Promise.all([
      getSummary({ from, to }),
      getByCategory({ from, to }),
      getTransactions({ limit: 8 }),
    ]).then(([sum, byCat, txData]) => {
      setSummary(sum);
      setCategoryData(byCat);
      setRecentTx(txData.transactions);
    }).finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <Spinner className="py-12" />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Panel de Control</h1>

      <div className="space-y-6">
        <BalanceOverview summary={summary} />

        <div className="grid gap-6 lg:grid-cols-2">
          <SpendingByCategory expenses={categoryData?.expenses} />
          <RecentTransactions transactions={recentTx} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
