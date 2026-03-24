import { Pencil, Trash2, Wallet, Landmark, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import PropTypes from 'prop-types';
import { formatCurrency, getAccountTypeLabel, getBalanceTone } from '../../utils/formatters.js';
import { accountShape } from '../../utils/propTypes.js';

const typeIcons = {
  checking: Landmark,
  savings: Wallet,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

export default function AccountCard({ account, onEdit, onDelete }) {
  const Icon = typeIcons[account.type] || Wallet;
  const balance = Number.parseFloat(account.balance);

  return (
    <div className="list-row flex-col items-start gap-1.5">
      <div className="flex w-full items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-accent-600" />
        <p className="flex-1 truncate text-sm font-medium text-app">{account.name}</p>
        <p className={`shrink-0 whitespace-nowrap text-sm font-semibold ${getBalanceTone(balance)}`}>
          {formatCurrency(balance, account.currency)}
        </p>
      </div>
      <div className="flex w-full items-center gap-1 pl-7 text-xs text-app-muted">
        <span className="shrink-0 font-medium text-app-soft">{getAccountTypeLabel(account.type)}</span>
        {account.currency !== 'ARS' && (
          <>
            <span className="shrink-0"> · </span>
            <span className="shrink-0">{account.currency}</span>
          </>
        )}
        {(onEdit || onDelete) && (
          <div className="ml-auto flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(account)}
                aria-label="Editar cuenta"
                className="interactive-subtle p-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(account)}
                aria-label="Eliminar cuenta"
                className="rounded-soft p-1.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

AccountCard.propTypes = {
  account: accountShape.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
