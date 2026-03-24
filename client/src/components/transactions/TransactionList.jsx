import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';
import Badge from '../ui/Badge.jsx';
import { getCategoryIcon } from '../ui/IconPicker.jsx';
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
            {items.map(tx => {
              const title = tx.description || tx.category?.name || '—';
              const CategoryIcon = tx.category?.icon ? getCategoryIcon(tx.category.icon) : null;
              const showCategoryIcon = Boolean(tx.description && CategoryIcon);

              const subtitle = (
                <p className="flex items-center gap-1 truncate text-xs text-app-muted">
                  {showCategoryIcon ? (
                    <span className="inline-flex items-center gap-1 text-app-soft shrink-0">
                      <CategoryIcon className="h-3 w-3" />
                      {tx.account?.name ? ' · ' : ''}
                    </span>
                  ) : null}
                  <span className="truncate">{tx.account?.name}</span>
                  {tx.type === 'transfer' && tx.transferToAccount ? (
                    <><ArrowRight className="inline h-3 w-3 shrink-0" /> {tx.transferToAccount.name}</>
                  ) : null}
                </p>
              );

              return (
                <div key={tx.id} className="list-row flex-col items-start md:flex-row md:items-center">
                  {/* Row 1 (mobile) / left column (desktop): badge + title + desktop subtitle */}
                  <div className="min-w-0 flex items-center gap-3 w-full md:flex-1">
                    <Badge color={getTransactionTypeColor(tx.type)}>
                      {getTransactionTypeLabel(tx.type)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-app">{title}</p>
                      <div className="hidden md:block">{subtitle}</div>
                    </div>
                  </div>

                  {/* Row 2 (mobile) / right column (desktop): mobile subtitle + amount + actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 min-w-0 md:hidden">{subtitle}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`whitespace-nowrap text-sm font-semibold ${getAmountTone(tx.type)}`}>
                        {amountPrefix(tx.type)}{formatCurrency(Number.parseFloat(tx.amount))}
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
                </div>
              );
            })}
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
