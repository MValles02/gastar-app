import PropTypes from 'prop-types';
import { formatCurrency } from '../../utils/formatters.js';

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
];

export default function SpendingByCategory({ data }) {
  if (!data || data.length === 0) {
    return (
      <section className="section-block">
        <div>
          <h3 className="section-title">Gastos por categoría</h3>
          <p className="section-description">Todavía no hay gastos registrados en este período.</p>
        </div>
        <div className="list-surface px-5 py-6 text-sm text-app-muted">
          Registrá gastos para ver cómo se distribuyen entre categorías.
        </div>
      </section>
    );
  }

  const items = data.map((item, index) => ({
    name: item.categoryName,
    value: item.total,
    color: COLORS[index % COLORS.length],
  }));

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="section-block">
      <h3 className="section-title">Gastos por categoría</h3>

      <div className="list-surface divide-y divide-border-default/40">
        {items.map(item => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="truncate text-sm font-medium text-app">{item.name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs text-app-muted">{pct.toFixed(0)}%</span>
                  <p className="whitespace-nowrap text-sm font-semibold text-app">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

SpendingByCategory.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    categoryName: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
  })),
};
