import { useState } from 'react';
import AccountCard from '../../../shared/components/ui/AccountCard.js';
import type { Account } from '../../../shared/types/domain.types.js';

interface Props {
  accounts?: Account[];
}

type SortKey = 'balance-desc' | 'balance-asc' | 'name-asc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'balance-desc', label: 'Mayor balance' },
  { value: 'balance-asc', label: 'Menor balance' },
  { value: 'name-asc', label: 'Nombre A–Z' },
];

function sortAccounts(accounts: Account[], sort: SortKey): Account[] {
  return [...accounts].sort((a, b) => {
    if (sort === 'balance-desc')
      return Number.parseFloat(String(b.arsBalance)) - Number.parseFloat(String(a.arsBalance));
    if (sort === 'balance-asc')
      return Number.parseFloat(String(a.arsBalance)) - Number.parseFloat(String(b.arsBalance));
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });
}

export default function ActiveAccounts({ accounts = [] }: Props): JSX.Element {
  const [sort, setSort] = useState<SortKey>('balance-desc');

  const visible = sortAccounts(
    accounts.filter((a) => Number.parseFloat(String(a.arsBalance)) !== 0),
    sort
  );

  return (
    <section className="section-block">
      <div className="section-heading">
        <h3 className="section-title min-w-0">Cuentas activas</h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-soft border border-border-default/80 bg-surface px-2 py-1 text-xs text-app-muted shadow-panel-sm transition-colors hover:border-border-default focus:outline-none focus:ring-1 focus:ring-accent-600/50"
          aria-label="Ordenar cuentas"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="list-surface">
        {visible.length > 0 ? (
          visible.map((account) => <AccountCard key={account.id} account={account} />)
        ) : (
          <div className="px-5 py-6 text-sm text-app-muted">No hay cuentas con saldo.</div>
        )}
      </div>
    </section>
  );
}
