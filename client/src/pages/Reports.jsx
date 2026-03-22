import { useCallback, useEffect, useState } from 'react';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { getSummary, getByCategory } from '../services/reports.js';
import { Page, PageHeader } from '../components/layout/Page.jsx';
import SpendingByCategory from '../components/dashboard/SpendingByCategory.jsx';
import Input from '../components/ui/Input.jsx';
import { ListPageSkeleton } from '../components/ui/PageSkeletons.jsx';
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

  return (
    <Page>
      <PageHeader
        eyebrow="Análisis"
        title="Reportes"
        description="Compará ingresos, gastos y balance neto dentro del período que elijas."
      />

      <div className="space-y-6">
        <section className="list-surface p-4 md:p-5">
          <div className="section-heading pb-4">
            <div>
              <h2 className="section-title">Período</h2>
              <p className="section-description">Ajustá el rango para recalcular el resumen financiero.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Desde"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </section>

        {loading ? <ListPageSkeleton metricCount={3} /> : null}
        {error ? <PageErrorState title="No pudimos cargar los reportes" message={error} onAction={load} /> : null}

        {!loading && !error && summary ? (
          <div className="space-y-8">
            <div className="metric-strip">
              <div className="metric-card">
                <p className="metric-label">Ingresos</p>
                <p className={`mt-2 text-2xl font-semibold ${getAmountTone('income')}`}>
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Gastos</p>
                <p className={`mt-2 text-2xl font-semibold ${getAmountTone('expense')}`}>
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Balance neto</p>
                <p className={`mt-2 text-2xl font-semibold ${netFlowTone}`}>
                  {formatCurrency(summary.netFlow)}
                </p>
              </div>
            </div>

            <SpendingByCategory expenses={categoryData?.expenses} />
          </div>
        ) : null}
      </div>
    </Page>
  );
}

export default Reports;
