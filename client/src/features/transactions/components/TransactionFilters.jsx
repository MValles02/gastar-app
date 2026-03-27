import { useState } from 'react';
import Select from '../../../shared/components/ui/Select.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import PropTypes from 'prop-types';
import { accountShape, categoryShape, filtersShape } from '../../../shared/utils/propTypes.js';
import { typeFilterOptions } from '../../../shared/constants/transactionTypes.js';

export default function TransactionFilters({ filters, onChange, accounts, categories }) {
  const [localFilters, setLocalFilters] = useState({ ...filters });

  const update = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const apply = () => {
    onChange({ ...localFilters, page: 1 });
  };

  const clear = () => {
    const reset = { page: 1, limit: 20 };
    setLocalFilters(reset);
    onChange(reset);
  };

  const hasLocalFilters =
    localFilters.accountId ||
    localFilters.categoryId ||
    localFilters.type ||
    localFilters.from ||
    localFilters.to;

  return (
    <section className="list-surface p-4 md:p-5">
      <div className="section-heading pb-4">
        <h2 className="section-title">Filtro</h2>
        {hasLocalFilters ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select
          label="Cuenta"
          placeholder="Todas"
          value={localFilters.accountId || ''}
          onChange={(e) => update('accountId', e.target.value || undefined)}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          label="Categoría"
          placeholder="Todas"
          value={localFilters.categoryId || ''}
          onChange={(e) => update('categoryId', e.target.value || undefined)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          label="Tipo"
          placeholder="Todos"
          value={localFilters.type || ''}
          onChange={(e) => update('type', e.target.value || undefined)}
          options={typeFilterOptions}
        />
        <Input
          label="Desde"
          type="date"
          value={localFilters.from || ''}
          onChange={(e) => update('from', e.target.value || undefined)}
        />
        <Input
          label="Hasta"
          type="date"
          value={localFilters.to || ''}
          onChange={(e) => update('to', e.target.value || undefined)}
        />
      </div>

      <div className="flex justify-end pt-3">
        <Button variant="primary" size="sm" onClick={apply}>
          Aplicar filtros
        </Button>
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
