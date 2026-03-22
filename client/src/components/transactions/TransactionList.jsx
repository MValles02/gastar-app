import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';
import Badge from '../ui/Badge.jsx';
import {
  formatCurrency,
  formatDate,
  getAmountTone,
  getTransactionTypeLabel,
  getTransactionTypeColor,
} from '../../utils/formatters.js';
import { transactionShape } from '../../utils/propTypes.js';

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
    <div className="space-y-8">
      {Object.entries(grouped).map(([dateKey, items]) => (
        <section key={dateKey} className="section-block">
          <div className="section-heading">
            <div>
              <h3 className="section-title">{formatDate(dateKey)}</h3>
              <p className="section-description">{items.length} movimientos registrados</p>
            </div>
          </div>

          <div className="list-surface">
            {items.map(tx => (
              <div key={tx.id} className="list-row">
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
                      {tx.type === 'transfer' && tx.transferToAccount ? (
                        <>
                          {' '}<ArrowRight className="inline h-3 w-3" /> {tx.transferToAccount.name}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`whitespace-nowrap text-sm font-semibold ${getAmountTone(tx.type)}`}>
                    {amountPrefix(tx.type)}
                    {formatCurrency(Number.parseFloat(tx.amount))}
                  </span>
                  <button
                    onClick={() => onEdit(tx)}
                    aria-label="Editar transacción"
                    className="interactive-subtle p-2.5"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(tx)}
                    aria-label="Eliminar transacción"
                    className="rounded-soft p-2.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

TransactionList.propTypes = {
  transactions: PropTypes.arrayOf(transactionShape).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
