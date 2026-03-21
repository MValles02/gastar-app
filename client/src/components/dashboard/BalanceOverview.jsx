import { Landmark, Wallet, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import { formatCurrency, getAccountTypeLabel, getAmountTone, getBalanceTone } from '../../utils/formatters.js';
import { summaryShape } from '../../utils/propTypes.js';

const typeIcons = {
  checking: Landmark,
  savings: Wallet,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

export default function BalanceOverview({ summary }) {
  if (!summary) return null;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="rounded-hero border border-border-default/80 bg-surface/78 p-6 shadow-panel backdrop-blur-sm md:p-8">
        <div className="space-y-2">
          <p className="page-kicker">Balance actual</p>
          <h2 className="text-4xl font-semibold tracking-tight text-app md:text-5xl">
            {formatCurrency(summary.totalBalance)}
          </h2>
          <p className="max-w-xl text-sm leading-6 text-app-muted">
            Vista consolidada de tus cuentas para entender cuánto margen real tenés antes de cargar o revisar movimientos.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="metric-card">
            <p className="metric-label">Ingresos</p>
            <p className={`mt-2 text-2xl font-semibold ${getAmountTone('income')}`}>
              {formatCurrency(summary.totalIncome)}
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Gastos</p>
            <p className={`mt-2 text-2xl font-semibold ${getAmountTone('expense')}`}>
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Saldo neto</p>
            <p className={`mt-2 text-2xl font-semibold ${getBalanceTone(summary.totalBalance)}`}>
              {formatCurrency(summary.totalBalance)}
            </p>
          </div>
        </div>
      </div>

      <div className="list-surface">
        <div className="px-5 py-4">
          <p className="page-kicker">Cuentas activas</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-app">Origen del balance</h3>
        </div>

        {summary.accounts.length > 0 ? (
          <div>
            {summary.accounts.map(account => {
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
            })}
          </div>
        ) : (
          <div className="px-5 pb-5 text-sm text-app-muted">
            Todavía no hay cuentas cargadas.
          </div>
        )}
      </div>
    </section>
  );
}

BalanceOverview.propTypes = {
  summary: summaryShape,
};
