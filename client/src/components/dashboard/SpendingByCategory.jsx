import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PropTypes from 'prop-types';
import { formatCurrency } from '../../utils/formatters.js';

const COLORS = [
  '#16a57f', '#3a7da8', '#c1841f', '#b14a4a', '#7e5bef',
  '#d25791', '#2f9b95', '#d27b3c', '#5f70d8', '#7ca32a',
];

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="panel rounded-soft p-3 text-sm shadow-panel">
      <p className="font-medium text-app">{item.name}</p>
      <p className="text-app-muted">{formatCurrency(item.value)}</p>
    </div>
  );
}

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

  const chartData = data.map((item, index) => ({
    name: item.categoryName,
    value: item.total,
    fill: COLORS[index % COLORS.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="section-block">
      <div>
        <h3 className="section-title">Gastos por categoría</h3>
        <p className="section-description">Un corte rápido de dónde se concentra la salida de dinero.</p>
      </div>

      <div className="list-surface">
        <div className="grid gap-0 md:grid-cols-[auto_1fr]">
          {/* Chart */}
          <div className="flex items-center justify-center px-6 py-6 md:border-r md:border-border-default/50">
            <div
              className="h-[13rem] w-[13rem] sm:h-[15rem] sm:w-[15rem]"
              role="img"
              aria-label="Gráfico de gastos por categoría"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="divide-y divide-border-default/40">
            {chartData.map(item => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.name} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-none rounded-full"
                        style={{ backgroundColor: item.fill }}
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
                      style={{ width: `${pct}%`, backgroundColor: item.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const expenseShape = PropTypes.shape({
  categoryName: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
});

CategoryTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.number,
  })),
};

SpendingByCategory.propTypes = {
  data: PropTypes.arrayOf(expenseShape),
};
