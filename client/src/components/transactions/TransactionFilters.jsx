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
    <section className="list-surface p-4 md:p-5">
      <div className="section-heading pb-4">
        <div>
          <h2 className="section-title">Filtro operativo</h2>
          <p className="section-description">Acotá la lista por cuenta, categoría, tipo o rango de fechas.</p>
        </div>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select
          label="Cuenta"
          placeholder="Todas"
          value={filters.accountId || ''}
          onChange={(e) => update('accountId', e.target.value || undefined)}
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
        />
        <Select
          label="Categoría"
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
        <Input
          label="Desde"
          type="date"
          value={filters.from || ''}
          onChange={(e) => update('from', e.target.value || undefined)}
        />
        <Input
          label="Hasta"
          type="date"
          value={filters.to || ''}
          onChange={(e) => update('to', e.target.value || undefined)}
        />
      </div>
    </section>
  );
}

TransactionFilters.propTypes = {
  filters: filtersShape.isRequired,
  onChange: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  categories: PropTypes.arrayOf(categoryShape).isRequired,
};
