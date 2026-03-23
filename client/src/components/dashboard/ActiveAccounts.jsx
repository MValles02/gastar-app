import { useState } from 'react';
import { Landmark, Wallet, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import PropTypes from 'prop-types';
import { formatCurrency, getAccountTypeLabel, getBalanceTone } from '../../utils/formatters.js';

const typeIcons = {
  checking: Landmark,
  savings: Wallet,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

const SORT_OPTIONS = [
  { value: 'balance-desc', label: 'Mayor balance' },
  { value: 'balance-asc', label: 'Menor balance' },
  { value: 'name-asc', label: 'Nombre A–Z' },
];

function sortAccounts(accounts, sort) {
  return [...accounts].sort((a, b) => {
    if (sort === 'balance-desc') return Number.parseFloat(b.balance) - Number.parseFloat(a.balance);
    if (sort === 'balance-asc') return Number.parseFloat(a.balance) - Number.parseFloat(b.balance);
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });
}

export default function ActiveAccounts({ accounts }) {
  const [sort, setSort] = useState('balance-desc');

  const visible = sortAccounts(
    accounts.filter(a => Number.parseFloat(a.balance) !== 0),
    sort,
  );

  return (
    <section className="section-block">
      <div className="section-heading">
        <h3 className="section-title">Cuentas activas</h3>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-soft border border-border-default/80 bg-surface px-2 py-1 text-xs text-app-muted shadow-panel-sm transition-colors hover:border-border-default focus:outline-none focus:ring-1 focus:ring-accent-600/50"
          aria-label="Ordenar cuentas"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="list-surface">
        {visible.length > 0 ? (
          visible.map(account => {
            const Icon = typeIcons[account.type] || Wallet;
            const balance = Number.parseFloat(account.balance);

            return (
              <div key={account.id} className="list-row">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-panel bg-surface-muted text-accent-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-app">{account.name}</p>
                    <p className="truncate text-xs text-app-muted">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>
                <p className={`whitespace-nowrap text-sm font-semibold ${getBalanceTone(balance)}`}>
                  {formatCurrency(balance, account.currency)}
                </p>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-6 text-sm text-app-muted">
            No hay cuentas con saldo.
          </div>
        )}
      </div>
    </section>
  );
}

ActiveAccounts.propTypes = {
  accounts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    balance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    currency: PropTypes.string,
  })),
};

ActiveAccounts.defaultProps = {
  accounts: [],
};
