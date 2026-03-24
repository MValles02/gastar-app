import { useCallback, useState } from 'react';
import { ArrowLeft, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/layout/Page.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { ListPageSkeleton } from '../../components/ui/PageSkeletons.jsx';
import PageErrorState from '../../components/ui/PageErrorState.jsx';
import { getCategoryIcon } from '../../components/ui/IconPicker.jsx';
import { getFrequency } from '../../services/reports.js';
import { getErrorMessage } from '../../utils/errors.js';

const now = new Date();
const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const defaultTo = now.toISOString().split('T')[0];

export default function Frequency() {
  const [localFrom, setLocalFrom] = useState(defaultFrom);
  const [localTo, setLocalTo] = useState(defaultTo);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(null);

  const load = useCallback(async (from, to) => {
    setLoading(true);
    setError('');
    try {
      const result = await getFrequency({ from: from || undefined, to: to || undefined });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos cargar la frecuencia de gastos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const apply = () => {
    setAppliedFilters({ from: localFrom, to: localTo });
    load(localFrom, localTo);
  };

  const maxCount = data && data.length > 0 ? data[0].count : 1;

  return (
    <Page>
      <Link
        to="/reports"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-app-muted transition-colors duration-200 hover:text-app"
      >
        <ArrowLeft className="h-4 w-4" />
        Reportes
      </Link>

      <h1 className="page-title mb-6">Frecuencia de gastos</h1>

      <div className="space-y-6">
        <section className="list-surface p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Desde"
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-3">
            <Button variant="primary" size="sm" onClick={apply} loading={loading}>
              Aplicar filtros
            </Button>
          </div>
        </section>

        {loading ? <ListPageSkeleton metricCount={3} /> : null}
        {error ? (
          <PageErrorState
            title="No pudimos cargar la frecuencia"
            message={error}
            onAction={() => appliedFilters && load(appliedFilters.from, appliedFilters.to)}
          />
        ) : null}

        {!loading && !error && data ? (
          data.length === 0 ? (
            <section className="section-block">
              <div className="list-surface px-5 py-6 text-sm text-app-muted">
                No hay transacciones registradas en este período.
              </div>
            </section>
          ) : (
            <div className="list-surface divide-y divide-border-default/40">
              {data.map((item) => {
                const Icon = getCategoryIcon(item.categoryIcon) || Tag;
                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={item.categoryId} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-app-muted" />
                        <p className="truncate text-sm font-medium text-app">{item.categoryName}</p>
                      </div>
                      <p className="whitespace-nowrap text-sm text-app-muted">
                        {item.count} {item.count === 1 ? 'transacción' : 'transacciones'}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-accent-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>
    </Page>
  );
}
