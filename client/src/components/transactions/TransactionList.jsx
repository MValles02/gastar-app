import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { formatCurrency, formatDate, getAmountTone, getTransactionTypeLabel, getTransactionTypeColor } from '../../utils/formatters.js';

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const grouped = {};
  for (const tx of transactions) {
    const dateKey = tx.date.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  }

  const amountPrefix = (type) => {
    if (type === 'income') return '+';
    if (type === 'expense') return '-';
    return '';
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey} className="space-y-2">
          <h3 className="text-sm font-medium text-app-muted">
            {formatDate(dateKey)}
          </h3>
          <div className="space-y-2">
            {items.map(tx => (
              <div
                key={tx.id}
                className="panel flex items-center justify-between p-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <Badge color={getTransactionTypeColor(tx.type)}>
                    {getTransactionTypeLabel(tx.type)}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-app">
                      {tx.description || tx.category?.name}
                    </p>
                    <p className="truncate text-xs text-app-muted">
                      {tx.account?.name}
                      {tx.type === 'transfer' && tx.transferToAccount && (
                        <>
                          {' '}<ArrowRight className="inline h-3 w-3" />{' '}
                          {tx.transferToAccount.name}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`whitespace-nowrap text-sm font-semibold ${getAmountTone(tx.type)}`}>
                    {amountPrefix(tx.type)}{formatCurrency(parseFloat(tx.amount))}
                  </span>
                  <button
                    onClick={() => onEdit(tx)}
                    className="interactive-subtle p-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(tx)}
                    className="rounded-soft p-1.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
