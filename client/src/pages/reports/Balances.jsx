import { useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/layout/Page.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { ListPageSkeleton } from '../../components/ui/PageSkeletons.jsx';
import PageErrorState from '../../components/ui/PageErrorState.jsx';
import { getMonthly } from '../../services/reports.js';
import { formatCurrency, getAmountTone } from '../../utils/formatters.js';
import { getErrorMessage } from '../../utils/errors.js';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 3 + i;
  return { value: String(y), label: String(y) };
});

export default function Balances() {
  const [localYear, setLocalYear] = useState(String(currentYear));
  const [appliedYear, setAppliedYear] = useState(String(currentYear));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (year) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMonthly({ year });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos cargar los balances.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const apply = () => {
    setAppliedYear(localYear);
    load(localYear);
  };

  return (
    <Page>
      <Link
        to="/reports"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-app-muted transition-colors duration-200 hover:text-app"
      >
        <ArrowLeft className="h-4 w-4" />
        Reportes
      </Link>

      <h1 className="page-title mb-6">Balances</h1>

      <div className="space-y-6">
        <section className="list-surface p-4 md:p-5">
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Select
                label="Año"
                value={localYear}
                onChange={(e) => setLocalYear(e.target.value)}
                options={yearOptions}
              />
            </div>
            <Button variant="primary" size="sm" onClick={apply} loading={loading}>
              Aplicar
            </Button>
          </div>
        </section>

        {loading ? <ListPageSkeleton metricCount={3} /> : null}
        {error ? (
          <PageErrorState title="No pudimos cargar los balances" message={error} onAction={() => load(appliedYear)} />
        ) : null}

        {!loading && !error && data ? (
          <div className="list-surface divide-y divide-border-default/40">
            <div className="grid grid-cols-2 gap-2 px-5 py-2.5 md:grid-cols-4">
              <p className="text-xs font-medium text-app-muted">Mes</p>
              <p className="hidden text-right text-xs font-medium text-app-muted md:block">Ingresos</p>
              <p className="hidden text-right text-xs font-medium text-app-muted md:block">Gastos</p>
              <p className="text-right text-xs font-medium text-app-muted">Balance</p>
            </div>

            {data.months.map((row) => {
              const balanceTone = row.netFlow >= 0 ? getAmountTone('income') : getAmountTone('expense');
              const hasData = row.income > 0 || row.expenses > 0;
              return (
                <div
                  key={row.month}
                  className={`grid grid-cols-2 gap-2 px-5 py-3 md:grid-cols-4 ${!hasData ? 'opacity-40' : ''}`}
                >
                  <p className="text-sm text-app">{MONTH_NAMES[row.month - 1]}</p>
                  <p className={`hidden text-right text-sm md:block ${getAmountTone('income')}`}>
                    {formatCurrency(row.income)}
                  </p>
                  <p className={`hidden text-right text-sm md:block ${getAmountTone('expense')}`}>
                    {formatCurrency(row.expenses)}
                  </p>
                  <p className={`text-right text-sm font-semibold ${balanceTone}`}>
                    {row.netFlow >= 0 ? '+' : ''}{formatCurrency(row.netFlow)}
                  </p>
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-2 bg-surface-muted px-5 py-3 md:grid-cols-4">
              <p className="text-sm font-semibold text-app">Total {appliedYear}</p>
              <p className={`hidden text-right text-sm font-semibold md:block ${getAmountTone('income')}`}>
                {formatCurrency(data.totals.income)}
              </p>
              <p className={`hidden text-right text-sm font-semibold md:block ${getAmountTone('expense')}`}>
                {formatCurrency(data.totals.expenses)}
              </p>
              <p className={`text-right text-sm font-bold ${data.totals.netFlow >= 0 ? getAmountTone('income') : getAmountTone('expense')}`}>
                {data.totals.netFlow >= 0 ? '+' : ''}{formatCurrency(data.totals.netFlow)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Page>
  );
}
