import Select from '../ui/Select.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import PropTypes from 'prop-types';
import { accountShape, categoryShape, filtersShape } from '../../utils/propTypes.js';

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
    <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[11rem] flex-1">
        <Select
          label="Cuenta"
          placeholder="Todas"
          value={filters.accountId || ''}
          onChange={(e) => update('accountId', e.target.value || undefined)}
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
        />
      </div>
      <div className="min-w-[11rem] flex-1">
        <Select
          label="Categoría"
          placeholder="Todas"
          value={filters.categoryId || ''}
          onChange={(e) => update('categoryId', e.target.value || undefined)}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <Select
          label="Tipo"
          placeholder="Todos"
          value={filters.type || ''}
          onChange={(e) => update('type', e.target.value || undefined)}
          options={typeOptions}
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <Input
          label="Desde"
          type="date"
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value || undefined)}
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <Input
          label="Hasta"
          type="date"
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value || undefined)}
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

TransactionFilters.propTypes = {
  filters: filtersShape.isRequired,
  onChange: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  categories: PropTypes.arrayOf(categoryShape).isRequired,
};
