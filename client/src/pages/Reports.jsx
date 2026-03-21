import { useCallback, useEffect, useState } from 'react';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { getSummary, getByCategory } from '../services/reports.js';
import { Page, PageHeader } from '../components/layout/Page.jsx';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { formatCurrency, getAmountTone } from '../utils/formatters.js';
import { getErrorMessage } from '../utils/errors.js';

function Reports() {
  const { refreshKey } = useTransactionModal();
  const now = new Date();
  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [to, setTo] = useState(now.toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [sum, byCat] = await Promise.all([
        getSummary({ from, to }),
        getByCategory({ from, to }),
      ]);

      setSummary(sum);
      setCategoryData(byCat);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos cargar los reportes.'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const netFlowTone = summary?.netFlow >= 0 ? getAmountTone('income') : getAmountTone('expense');
  let content;

  if (loading) {
    content = <Spinner className="py-12" />;
  } else if (error) {
    content = <PageErrorState title="No pudimos cargar los reportes" message={error} onAction={load} />;
  } else {
    content = (
      <div className="space-y-6">
        {summary && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center !p-5">
              <p className="text-sm text-app-muted">Ingresos</p>
              <p className={`text-2xl font-semibold ${getAmountTone('income')}`}>
                {formatCurrency(summary.totalIncome)}
              </p>
            </Card>
            <Card className="text-center !p-5">
              <p className="text-sm text-app-muted">Gastos</p>
              <p className={`text-2xl font-semibold ${getAmountTone('expense')}`}>
                {formatCurrency(summary.totalExpenses)}
              </p>
            </Card>
            <Card className="text-center !p-5">
              <p className="text-sm text-app-muted">Balance neto</p>
              <p className={`text-2xl font-semibold ${netFlowTone}`}>
                {formatCurrency(summary.netFlow)}
              </p>
            </Card>
          </div>
        )}

        <SpendingByCategory expenses={categoryData?.expenses} />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Reportes"
        description="Compará ingresos, gastos y balance neto dentro del período que elijas."
      />

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[11rem] flex-1">
          <Input
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="min-w-[11rem] flex-1">
          <Input
            label="Hasta"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {content}
    </Page>
  );
}

export default Reports;
