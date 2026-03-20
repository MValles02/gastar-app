import { Link } from 'react-router-dom';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency, formatDateShort, getTransactionTypeColor, getTransactionTypeLabel } from '../../utils/formatters.js';

export default function RecentTransactions({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Ultimas transacciones</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay transacciones recientes.</p>
      </Card>
    );
  }

  const amountColor = (type) => {
    if (type === 'income') return 'text-emerald-600 dark:text-emerald-400';
    if (type === 'expense') return 'text-red-600 dark:text-red-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const amountPrefix = (type) => {
    if (type === 'income') return '+';
    if (type === 'expense') return '-';
    return '';
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ultimas transacciones</h3>
        <Link to="/transactions" className="inline-flex items-center gap-1 text-sm text-accent-600 hover:underline">
          Ver todas <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Badge color={getTransactionTypeColor(tx.type)}>
                {getTransactionTypeLabel(tx.type).charAt(0)}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                  {tx.description || tx.category?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateShort(tx.date)}
                </p>
              </div>
            </div>
            <span className={`text-sm font-medium whitespace-nowrap ${amountColor(tx.type)}`}>
              {amountPrefix(tx.type)}{formatCurrency(parseFloat(tx.amount))}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
