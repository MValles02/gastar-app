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
        <h3 className="section-title min-w-0">Cuentas activas</h3>
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
              <div key={account.id} className="list-row flex-col items-start gap-1.5">
                {/* Row 1: icon + account name + balance */}
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-4 w-4 shrink-0 text-accent-600" />
                  <p className="truncate text-sm font-medium text-app flex-1">{account.name}</p>
                  <p className={`whitespace-nowrap text-sm font-semibold shrink-0 ${getBalanceTone(balance)}`}>
                    {formatCurrency(balance, account.currency)}
                  </p>
                </div>
                {/* Row 2: account type + currency (indented to align under name) */}
                <div className="flex items-center gap-1 w-full pl-7 text-xs text-app-muted">
                  <span className="font-medium text-app-soft shrink-0">{getAccountTypeLabel(account.type)}</span>
                  {account.currency !== 'ARS' && (
                    <>
                      <span className="shrink-0"> · </span>
                      <span className="shrink-0">{account.currency}</span>
                    </>
                  )}
                </div>
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
