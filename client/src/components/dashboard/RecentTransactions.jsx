import { Link } from 'react-router-dom';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import Badge from '../ui/Badge.jsx';
import {
  formatCurrency,
  formatDateShort,
  getAmountTone,
  getTransactionTypeColor,
  getTransactionTypeLabel,
} from '../../utils/formatters.js';
import { transactionShape } from '../../utils/propTypes.js';

export default function RecentTransactions({ transactions }) {
  const amountPrefix = (type) => {
    if (type === 'income') return '+';
    if (type === 'expense') return '-';
    return '';
  };

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h3 className="section-title">Últimos movimientos</h3>
          <p className="section-description">Los registros más recientes para corregir o validar rápido.</p>
        </div>
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 transition-colors hover:text-accent-700"
        >
          Ver todos <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      <div className="list-surface">
        {transactions && transactions.length > 0 ? (
          transactions.map(tx => (
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
                    {formatDateShort(tx.date)}
                    {tx.account?.name ? ` · ${tx.account.name}` : ''}
                  </p>
                </div>
              </div>
              <span className={`whitespace-nowrap text-sm font-semibold ${getAmountTone(tx.type)}`}>
                {amountPrefix(tx.type)}
                {formatCurrency(Number.parseFloat(tx.amount))}
              </span>
            </div>
          ))
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
