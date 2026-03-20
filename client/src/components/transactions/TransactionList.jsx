import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { formatCurrency, formatDate, getTransactionTypeLabel, getTransactionTypeColor } from '../../utils/formatters.js';

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const grouped = {};
  for (const tx of transactions) {
    const dateKey = tx.date.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
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
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey}>
          <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            {formatDate(dateKey)}
          </h3>
          <div className="space-y-2">
            {items.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge color={getTransactionTypeColor(tx.type)}>
                    {getTransactionTypeLabel(tx.type)}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tx.description || tx.category?.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
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
                  <span className={`text-sm font-semibold whitespace-nowrap ${amountColor(tx.type)}`}>
                    {amountPrefix(tx.type)}{formatCurrency(parseFloat(tx.amount))}
                  </span>
                  <button
                    onClick={() => onEdit(tx)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(tx)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
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
