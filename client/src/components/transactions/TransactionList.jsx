import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { getCategoryIcon } from '../ui/IconPicker.jsx';
import {
  formatCurrency,
  formatDate,
  getAmountTone,
} from '../../utils/formatters.js';
import { transactionShape } from '../../utils/propTypes.js';
import { TYPE_CONFIG, amountPrefix } from '../../constants/transactionTypes.js';

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const grouped = {};
  for (const tx of transactions) {
    const dateKey = tx.date.split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  }

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
              const { Icon: TypeIcon, tone: typeTone } = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.expense;

              return (
                <div key={tx.id} className="list-row flex-col items-start gap-1.5">
                  {/* Row 1: type icon + description + amount */}
                  <div className="flex items-center gap-3 w-full">
                    <TypeIcon className={`h-4 w-4 shrink-0 ${typeTone}`} />
                    <p className="truncate text-sm font-medium text-app flex-1">{title}</p>
                    <span className={`whitespace-nowrap text-sm font-semibold shrink-0 ${getAmountTone(tx.type)}`}>
                      {amountPrefix(tx.type)}{formatCurrency(Number.parseFloat(tx.amount), tx.account?.currency || 'ARS')}
                      {tx.account?.currency && tx.account.currency !== 'ARS' && (
                        <span className="ml-1 rounded px-1 py-0.5 text-xs font-medium bg-surface-raised text-app-muted">
                          {tx.account.currency}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Row 2: category icon + name + account + actions — indented to align with description */}
                  <div className="flex items-center gap-2 w-full pl-7">
                    <p className="flex items-center gap-1 truncate text-xs text-app-muted flex-1">
                      {CategoryIcon && <CategoryIcon className="h-3 w-3 shrink-0 text-app-soft" />}
                      {tx.category?.name ? (
                        <span className="font-medium text-app-soft shrink-0">{tx.category.name}</span>
                      ) : null}
                      {(CategoryIcon || tx.category?.name) && tx.account?.name ? (
                        <span className="shrink-0"> · </span>
                      ) : null}
                      <span className="truncate">{tx.account?.name}</span>
                      {tx.type === 'transfer' && tx.transferToAccount ? (
                        <><ArrowRight className="inline h-3 w-3 shrink-0" /> {tx.transferToAccount.name}</>
                      ) : null}
                      {tx.account?.currency && tx.account.currency !== 'ARS' && tx.cotizacion ? (
                        <span className="shrink-0"> · @{formatCurrency(Number.parseFloat(tx.cotizacion))}</span>
                      ) : null}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEdit(tx)}
                        aria-label="Editar transacción"
                        className="interactive-subtle p-2"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(tx)}
                        aria-label="Eliminar transacción"
                        className="rounded-soft p-2 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
