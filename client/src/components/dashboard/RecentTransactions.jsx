import { Link } from 'react-router-dom';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import { getCategoryIcon } from '../ui/IconPicker.jsx';
import {
  formatCurrency,
  formatDateShort,
  getAmountTone,
} from '../../utils/formatters.js';
import { transactionShape } from '../../utils/propTypes.js';
import { TYPE_CONFIG, amountPrefix } from '../../constants/transactionTypes.js';

export default function RecentTransactions({ transactions }) {

  return (
    <section className="section-block">
      <div className="section-heading">
        <h3 className="section-title min-w-0">Últimos movimientos</h3>
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 transition-colors hover:text-accent-700"
        >
          Ver todos <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      <div className="list-surface">
        {transactions && transactions.length > 0 ? (
          transactions.map(tx => {
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
                    {amountPrefix(tx.type)}{formatCurrency(Number.parseFloat(tx.amount))}
                  </span>
                </div>

                {/* Row 2: category icon + name + account + date — indented to align with description */}
                <div className="flex items-center gap-1 w-full pl-7 truncate text-xs text-app-muted">
                  {CategoryIcon && <CategoryIcon className="h-3 w-3 shrink-0 text-app-soft" />}
                  {tx.category?.name ? (
                    <span className="font-medium text-app-soft shrink-0">{tx.category.name}</span>
                  ) : null}
                  {(CategoryIcon || tx.category?.name) ? (
                    <span className="shrink-0"> · </span>
                  ) : null}
                  <span className="truncate">{tx.account?.name}</span>
                  <span className="shrink-0"> · {formatDateShort(tx.date)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-6 text-sm text-app-muted">
            No hay transacciones recientes.
          </div>
        )}
      </div>
    </section>
  );
}

RecentTransactions.propTypes = {
  transactions: PropTypes.arrayOf(transactionShape),
};
