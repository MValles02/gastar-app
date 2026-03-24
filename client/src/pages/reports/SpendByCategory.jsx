import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/layout/Page.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import MultiSelect from '../../components/ui/MultiSelect.jsx';
import { ListPageSkeleton } from '../../components/ui/PageSkeletons.jsx';
import PageErrorState from '../../components/ui/PageErrorState.jsx';
import SpendingByCategory from '../../components/dashboard/SpendingByCategory.jsx';
import { getByCategory } from '../../services/reports.js';
import { getAccounts } from '../../services/accounts.js';
import { getCategories } from '../../services/categories.js';
import { getErrorMessage } from '../../utils/errors.js';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'transfer', label: 'Transferencia' },
];

const now = new Date();
const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const defaultTo = now.toISOString().split('T')[0];

function computeNetByCategory(categoryData) {
  const expenses = categoryData?.expenses ?? [];
  const incomes = categoryData?.incomes ?? [];
  const incomeMap = new Map(incomes.map(i => [i.categoryId, i.total]));
  return expenses
    .map(e => ({ ...e, total: e.total - (incomeMap.get(e.categoryId) ?? 0) }))
    .filter(e => e.total > 0);
}

export default function SpendByCategory() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [localFilters, setLocalFilters] = useState({
    from: defaultFrom,
    to: defaultTo,
    accountIds: [],
    types: [],
    categoryIds: [],
  });

  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
    });
  }, []);

  const update = (key, value) => setLocalFilters(prev => ({ ...prev, [key]: value }));

  const load = useCallback(async (filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        from: filters.from || undefined,
        to: filters.to || undefined,
        ...(filters.accountIds.length && { accountId: filters.accountIds }),
        ...(filters.types.length && { type: filters.types }),
        ...(filters.categoryIds.length && { categoryId: filters.categoryIds }),
      };
      const result = await getByCategory(params);
      setCategoryData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos cargar los gastos por categoría.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const apply = () => load(localFilters);

  const netByCategory = computeNetByCategory(categoryData);

  return (
    <Page>
      <Link
        to="/reports"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-app-muted transition-colors duration-200 hover:text-app"
      >
        <ArrowLeft className="h-4 w-4" />
        Reportes
      </Link>

      <h1 className="page-title mb-6">Gastos por categoría</h1>

      <div className="space-y-6">
        <section className="list-surface p-4 md:p-5">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Desde"
                type="date"
                value={localFilters.from}
                onChange={(e) => update('from', e.target.value)}
              />
              <Input
                label="Hasta"
                type="date"
                value={localFilters.to}
                onChange={(e) => update('to', e.target.value)}
              />
            </div>

            {accounts.length > 0 && (
              <MultiSelect
                label="Cuentas"
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
                value={localFilters.accountIds}
                onChange={(v) => update('accountIds', v)}
              />
            )}

            <MultiSelect
              label="Tipo"
              options={TYPE_OPTIONS}
              value={localFilters.types}
              onChange={(v) => update('types', v)}
            />

            {categories.length > 0 && (
              <MultiSelect
                label="Categorías"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={localFilters.categoryIds}
                onChange={(v) => update('categoryIds', v)}
              />
            )}

            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={apply} loading={loading}>
                Aplicar filtros
              </Button>
            </div>
          </div>
        </section>

        {loading ? <ListPageSkeleton metricCount={3} /> : null}
        {error ? (
          <PageErrorState
            title="No pudimos cargar los gastos"
            message={error}
            onAction={apply}
          />
        ) : null}

        {!loading && !error && categoryData ? (
          <SpendingByCategory data={netByCategory} />
        ) : null}
      </div>
    </Page>
  );
}
