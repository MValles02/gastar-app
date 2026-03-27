import { useState } from 'react';
import PropTypes from 'prop-types';
import FilterBar from '../../../shared/components/compound/FilterBar.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { accountShape, categoryShape, filtersShape } from '../../../shared/utils/propTypes.js';

export default function TransactionFilters({ filters, onChange, accounts, categories }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleApply = () => {
    onChange({ ...localFilters, page: 1 });
  };

  const handleReset = () => {
    const reset = { page: 1, limit: filters.limit ?? 20 };
    setLocalFilters(reset);
    onChange(reset);
  };

  const filterConfig = [
    {
      key: 'accountId',
      label: 'Cuenta',
      type: 'select',
      options: [
        { value: '', label: 'Todas' },
        ...accounts.map((a) => ({ value: a.id, label: a.name })),
      ],
    },
    {
      key: 'categoryId',
      label: 'Categoría',
      type: 'select',
      options: [
        { value: '', label: 'Todas' },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      key: 'type',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: '', label: 'Todos' },
        { value: 'income', label: 'Ingreso' },
        { value: 'expense', label: 'Gasto' },
        { value: 'transfer', label: 'Transferencia' },
      ],
    },
    { key: 'from', label: 'Desde', type: 'date' },
    { key: 'to', label: 'Hasta', type: 'date' },
  ];

  return (
    <section className="list-surface p-4 md:p-5">
      <div className="section-heading pb-4">
        <h2 className="section-title">Filtro</h2>
      </div>
      <FilterBar
        filters={filterConfig}
        values={localFilters}
        onChange={handleChange}
        onReset={handleReset}
      />
      <div className="pt-3">
        <Button type="button" onClick={handleApply}>
          Aplicar
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
