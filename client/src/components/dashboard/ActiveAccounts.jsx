import { useState } from 'react';
import PropTypes from 'prop-types';
import AccountCard from '../general/AccountCard.jsx';

const SORT_OPTIONS = [
  { value: 'balance-desc', label: 'Mayor balance' },
  { value: 'balance-asc', label: 'Menor balance' },
  { value: 'name-asc', label: 'Nombre A–Z' },
];

function sortAccounts(accounts, sort) {
  return [...accounts].sort((a, b) => {
    if (sort === 'balance-desc') return Number.parseFloat(b.balanceArs) - Number.parseFloat(a.balanceArs);
    if (sort === 'balance-asc') return Number.parseFloat(a.balanceArs) - Number.parseFloat(b.balanceArs);
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });
}

export default function ActiveAccounts({ accounts }) {
  const [sort, setSort] = useState('balance-desc');

  const visible = sortAccounts(
    accounts.filter(a => Number.parseFloat(a.balanceArs) !== 0),
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
          visible.map(account => (
            <AccountCard key={account.id} account={account} />
          ))
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
    balanceArs: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currency: PropTypes.string,
  })),
};

ActiveAccounts.defaultProps = {
  accounts: [],
};
