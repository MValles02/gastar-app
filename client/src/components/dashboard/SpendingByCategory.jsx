import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export default function SpendingByCategory({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Gastos por categoria</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay gastos en este periodo.</p>
      </Card>
    );
  }

  const data = expenses.map((item, i) => ({
    name: item.categoryName,
    value: item.total,
    fill: COLORS[i % COLORS.length],
  }));

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="font-medium">{item.name}</p>
        <p className="text-gray-500">{formatCurrency(item.value)}</p>
      </div>
    );
  };

  return (
    <Card>
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Gastos por categoria</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
