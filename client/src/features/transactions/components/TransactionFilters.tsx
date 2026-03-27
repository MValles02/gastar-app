import { useState } from 'react';
import FilterBar from '../../../shared/components/compound/FilterBar.js';
import Button from '../../../shared/components/ui/Button.js';
import type { TransactionFilters as TFilters } from '../services/transactions.js';
import type { Account } from '../../../shared/types/domain.types.js';
import type { Category } from '../../../shared/types/domain.types.js';

interface Props {
  filters: TFilters;
  onChange: (filters: TFilters) => void;
  accounts: Account[];
  categories: Category[];
}

export default function TransactionFilters({ filters, onChange, accounts, categories }: Props): JSX.Element {
  const [localFilters, setLocalFilters] = useState<TFilters>(filters);

  const handleChange = (key: string, value: string | string[]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: (value as string) || undefined }));
  };

  const handleApply = () => {
    onChange({ ...localFilters, page: 1 });
  };

  const handleReset = () => {
    const reset: TFilters = { page: 1, limit: filters.limit ?? 20 };
    setLocalFilters(reset);
    onChange(reset);
  };

  const filterConfig = [
    {
      key: 'accountId',
      label: 'Cuenta',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todas' },
        ...accounts.map((a) => ({ value: a.id, label: a.name })),
      ],
    },
    {
      key: 'categoryId',
      label: 'Categoría',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todas' },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      key: 'type',
      label: 'Tipo',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todos' },
        { value: 'income', label: 'Ingreso' },
        { value: 'expense', label: 'Gasto' },
        { value: 'transfer', label: 'Transferencia' },
      ],
    },
    { key: 'from', label: 'Desde', type: 'date' as const },
    { key: 'to', label: 'Hasta', type: 'date' as const },
  ];

  return (
    <section className="list-surface p-4 md:p-5">
      <div className="section-heading pb-4">
        <h2 className="section-title">Filtro</h2>
      </div>
      <FilterBar
        filters={filterConfig}
        values={localFilters as Record<string, string | string[] | number | undefined>}
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
