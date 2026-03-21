import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { getAccountTypeLabel } from '../../utils/formatters.js';

const typeOptions = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'transfer', label: 'Transferencia' },
];

export default function TransactionFilters({ filters, onChange, accounts, categories }) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const clear = () => {
    onChange({ page: 1, limit: 20 });
  };

  const hasFilters = filters.accountId || filters.categoryId || filters.type || filters.from || filters.to;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <Select
        label="Cuenta"
        placeholder="Todas"
        value={filters.accountId || ''}
        onChange={(e) => update('accountId', e.target.value || undefined)}
        options={accounts.map(a => ({ value: a.id, label: a.name }))}
      />
      <Select
        label="Categoria"
        placeholder="Todas"
        value={filters.categoryId || ''}
        onChange={(e) => update('categoryId', e.target.value || undefined)}
        options={categories.map(c => ({ value: c.id, label: c.name }))}
      />
      <Select
        label="Tipo"
        placeholder="Todos"
        value={filters.type || ''}
        onChange={(e) => update('type', e.target.value || undefined)}
        options={typeOptions}
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
        <input
          type="date"
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value || undefined)}
          className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
        <input
          type="date"
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value || undefined)}
          className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
