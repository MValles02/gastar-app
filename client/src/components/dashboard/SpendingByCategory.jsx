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

export default function SpendingByCategory({ expenses }) {
  if (!expenses || expenses.length === 0) {
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

  const data = expenses.map((item, index) => ({
    name: item.categoryName,
    value: item.total,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <section className="section-block">
      <div>
        <h3 className="section-title">Gastos por categoría</h3>
        <p className="section-description">Un corte rápido de dónde se concentra la salida de dinero.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="list-surface px-4 py-4">
          <div className="h-[18rem]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={102}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="list-surface">
          {data.map(item => (
            <div key={item.name} className="list-row">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 flex-none rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <p className="truncate text-sm font-medium text-app">{item.name}</p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold text-app">
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
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
  expenses: PropTypes.arrayOf(expenseShape),
};
