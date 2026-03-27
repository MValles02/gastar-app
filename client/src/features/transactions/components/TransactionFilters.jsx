import PropTypes from 'prop-types';
import FilterBar from '../../../shared/components/compound/FilterBar.jsx';
import { accountShape, categoryShape, filtersShape } from '../../../shared/utils/propTypes.js';
import { typeFilterOptions } from '../../../shared/constants/transactionTypes.js';

export default function TransactionFilters({ filters, onChange, accounts, categories }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value || undefined, page: 1 });
  };

  const handleReset = () => {
    onChange({ page: 1, limit: filters.limit ?? 20 });
  };

  const filterConfig = [
    {
      key: 'accountId',
      label: 'Cuenta',
      type: 'select',
      options: accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: 'categoryId',
      label: 'Categoría',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'type',
      label: 'Tipo',
      type: 'select',
      options: typeFilterOptions,
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
        values={filters}
        onChange={handleChange}
        onReset={handleReset}
      />
    </section>
  );
}

TransactionFilters.propTypes = {
  filters: filtersShape.isRequired,
  onChange: PropTypes.func.isRequired,
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  categories: PropTypes.arrayOf(categoryShape).isRequired,
};
