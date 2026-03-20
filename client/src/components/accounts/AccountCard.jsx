import { Pencil, Trash2, Wallet, Landmark, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatCurrency, getAccountTypeLabel } from '../../utils/formatters.js';

const typeIcons = {
  checking: Landmark,
  savings: Wallet,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

export default function AccountCard({ account, onEdit, onDelete }) {
  const Icon = typeIcons[account.type] || Wallet;
  const balance = parseFloat(account.balance);

  return (
    <Card className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-accent-50 p-2 dark:bg-accent-950">
          <Icon className="h-5 w-5 text-accent-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{account.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{getAccountTypeLabel(account.type)}</p>
          <p className={`mt-1 text-lg font-semibold ${balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(balance, account.currency)}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(account)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(account)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
