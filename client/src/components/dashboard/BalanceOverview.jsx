import Card from '../ui/Card.jsx';
import { formatCurrency, getAccountTypeLabel } from '../../utils/formatters.js';

export default function BalanceOverview({ summary }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Balance total</p>
        <p className={`text-3xl font-bold ${summary.totalBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(summary.totalBalance)}
        </p>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Ingresos: </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Gastos: </span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
        </div>
      </Card>

      {summary.accounts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.accounts.map(account => (
            <Card key={account.id} className="!p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{account.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getAccountTypeLabel(account.type)}</p>
              <p className={`mt-1 text-lg font-semibold ${parseFloat(account.balance) >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(parseFloat(account.balance), account.currency)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
