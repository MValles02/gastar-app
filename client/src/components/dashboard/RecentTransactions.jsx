import { Link } from 'react-router-dom';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency, formatDateShort, getAmountTone, getTransactionTypeColor, getTransactionTypeLabel } from '../../utils/formatters.js';

export default function RecentTransactions({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 font-semibold text-app">Últimas transacciones</h3>
        <p className="text-sm text-app-muted">No hay transacciones recientes.</p>
      </Card>
    );
  }

  const amountPrefix = (type) => {
    if (type === 'income') return '+';
    if (type === 'expense') return '-';
    return '';
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-app">Últimas transacciones</h3>
        <Link to="/transactions" className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 transition-colors hover:text-accent-700">
          Ver todas <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between py-1.5">
            <div className="min-w-0 flex items-center gap-2">
              <Badge color={getTransactionTypeColor(tx.type)}>
                {getTransactionTypeLabel(tx.type).charAt(0)}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm text-app">
                  {tx.description || tx.category?.name}
                </p>
                <p className="text-xs text-app-muted">
                  {formatDateShort(tx.date)}
                </p>
              </div>
            </div>
            <span className={`whitespace-nowrap text-sm font-medium ${getAmountTone(tx.type)}`}>
              {amountPrefix(tx.type)}{formatCurrency(parseFloat(tx.amount))}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
