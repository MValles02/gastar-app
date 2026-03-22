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
    <div className="list-row">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-panel bg-surface-muted text-accent-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-app">{account.name}</h3>
          <p className="truncate text-xs text-app-muted">{getAccountTypeLabel(account.type)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className={`whitespace-nowrap text-sm font-semibold ${getBalanceTone(balance)}`}>
          {formatCurrency(balance, account.currency)}
        </p>
        <button
          onClick={() => onEdit(account)}
          aria-label="Editar cuenta"
          className="interactive-subtle p-2.5"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(account)}
          aria-label="Eliminar cuenta"
          className="rounded-soft p-2.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

AccountCard.propTypes = {
  account: accountShape.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
