import { useState, useEffect } from 'react';
import { getSummary, getByCategory } from '../services/reports.js';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { formatCurrency } from '../utils/formatters.js';

function Reports() {
  const now = new Date();
  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [to, setTo] = useState(now.toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSummary({ from, to }),
      getByCategory({ from, to }),
    ]).then(([sum, byCat]) => {
      setSummary(sum);
      setCategoryData(byCat);
    }).finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Reportes</h1>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {loading ? (
        <Spinner className="py-12" />
      ) : (
        <div className="space-y-6">
          {summary && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="text-center !p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </Card>
              <Card className="text-center !p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Gastos</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </Card>
              <Card className="text-center !p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Balance neto</p>
                <p className={`text-xl font-bold ${summary.netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(summary.netFlow)}
                </p>
              </Card>
            </div>
          )}

          <SpendingByCategory expenses={categoryData?.expenses} />
        </div>
      )}
    </div>
  );
}

export default Reports;
