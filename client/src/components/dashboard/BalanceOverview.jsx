import Card from '../ui/Card.jsx';
import { formatCurrency, getAccountTypeLabel, getAmountTone, getBalanceTone } from '../../utils/formatters.js';
import { summaryShape } from '../../utils/propTypes.js';

export default function BalanceOverview({ summary }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-sm text-app-muted">Balance total</p>
        <p className={`text-3xl font-bold ${getBalanceTone(summary.totalBalance)}`}>
          {formatCurrency(summary.totalBalance)}
        </p>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <div>
            <span className="text-app-muted">Ingresos: </span>
            <span className={`font-medium ${getAmountTone('income')}`}>
              {formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div>
            <span className="text-app-muted">Gastos: </span>
            <span className={`font-medium ${getAmountTone('expense')}`}>
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
        </div>
      </Card>

      {summary.accounts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.accounts.map(account => (
            <Card key={account.id} className="!p-4">
              <p className="text-sm font-medium text-app">{account.name}</p>
              <p className="text-xs text-app-muted">{getAccountTypeLabel(account.type)}</p>
              <p className={`mt-1 text-lg font-semibold ${getBalanceTone(Number.parseFloat(account.balance))}`}>
                {formatCurrency(Number.parseFloat(account.balance), account.currency)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

BalanceOverview.propTypes = {
  summary: summaryShape,
};
