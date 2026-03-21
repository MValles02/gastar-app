import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const COLORS = [
  '#16a57f', '#3a7da8', '#c1841f', '#b14a4a', '#7e5bef',
  '#d25791', '#2f9b95', '#d27b3c', '#5f70d8', '#7ca32a',
];

export default function SpendingByCategory({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 font-semibold text-app">Gastos por categoría</h3>
        <p className="text-sm text-app-muted">No hay gastos en este período.</p>
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
      <div className="panel rounded-soft p-3 text-sm shadow-panel">
        <p className="font-medium text-app">{item.name}</p>
        <p className="text-app-muted">{formatCurrency(item.value)}</p>
      </div>
    );
  };

  return (
    <Card>
      <h3 className="mb-3 font-semibold text-app">Gastos por categoría</h3>
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
              <span className="text-xs text-app-muted">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
