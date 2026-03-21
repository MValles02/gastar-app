import { Pencil, Trash2, Wallet, Landmark, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import PropTypes from 'prop-types';
import Card from '../ui/Card.jsx';
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
    <Card className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-soft bg-accent-50 p-2.5 dark:bg-accent-950">
          <Icon className="h-5 w-5 text-accent-600" />
        </div>
        <div>
          <h3 className="font-medium text-app">{account.name}</h3>
          <p className="text-xs text-app-muted">{getAccountTypeLabel(account.type)}</p>
          <p className={`mt-1 text-lg font-semibold ${getBalanceTone(balance)}`}>
            {formatCurrency(balance, account.currency)}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(account)}
          className="interactive-subtle p-1.5"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(account)}
          className="rounded-soft p-1.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

AccountCard.propTypes = {
  account: accountShape.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
