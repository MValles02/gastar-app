import { formatCurrency, getAmountTone, getBalanceTone } from '../../../shared/utils/formatters.js';
import { summaryShape } from '../../../shared/utils/propTypes.js';

export default function BalanceOverview({ summary }) {
  if (!summary) return null;

  return (
    <div className="rounded-hero border border-border-default/80 bg-surface/78 p-6 shadow-panel backdrop-blur-sm md:p-8">
      <div className="space-y-2">
        <p className="page-kicker">Balance actual</p>
        <h2 className="text-4xl font-semibold tracking-tight text-app md:text-5xl">
          {formatCurrency(summary.totalBalance)}
        </h2>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="metric-card">
          <p className="metric-label">
            Ingresos <span className="font-normal text-app-soft">(este mes)</span>
          </p>
          <p className={`mt-2 text-2xl font-semibold ${getAmountTone('income')}`}>
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">
            Gastos <span className="font-normal text-app-soft">(este mes)</span>
          </p>
          <p className={`mt-2 text-2xl font-semibold ${getAmountTone('expense')}`}>
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">
            Saldo neto <span className="font-normal text-app-soft">(este mes)</span>
          </p>
          <p
            className={`mt-2 text-2xl font-semibold ${getBalanceTone(summary.totalIncome - summary.totalExpenses)}`}
          >
            {formatCurrency(summary.totalIncome - summary.totalExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}

BalanceOverview.propTypes = {
  summary: summaryShape,
};
