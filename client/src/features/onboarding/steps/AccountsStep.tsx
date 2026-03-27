import { useEffect, useState } from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import Input from '../../../shared/components/ui/Input.js';
import Select from '../../../shared/components/ui/Select.js';
import Button from '../../../shared/components/ui/Button.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import ExchangeRateInput, { saveExchangeRate } from '../../../shared/components/ui/ExchangeRateInput.js';
import { useOnboarding } from '../OnboardingContext.js';
import { createAccount, getAccounts } from '../../accounts/services/accounts.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { accountTypeOptions, accountTypeLabels } from '../../../shared/constants/accountTypes.js';
import type { AccountType, Currency } from '../../../shared/types/domain.types.js';

const currencyOptions = [
  { value: 'ARS', label: 'ARS - Peso argentino' },
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
];

interface FormState {
  name: string;
  type: string;
  currency: string;
  balance: string;
}

function resetForm(): FormState {
  return { name: '', type: 'checking', currency: 'ARS', balance: '0' };
}

export default function AccountsStep(): JSX.Element {
  const { goToNextStep, goToPrevStep, createdAccounts, addCreatedAccount } = useOnboarding();
  const [form, setForm] = useState<FormState>(resetForm());
  const [exchangeRate, setExchangeRate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (createdAccounts.length > 0) {
      setLoadingExisting(false);
      return;
    }

    getAccounts()
      .then((accounts) => {
        accounts.forEach((account) => addCreatedAccount(account));
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, 'No pudimos cargar tus cuentas actuales.'));
      })
      .finally(() => setLoadingExisting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: e.target.value }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Ingresá un nombre para la cuenta';
    const parsedBalance = Number.parseFloat(form.balance);

    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      nextErrors.balance = 'El saldo debe ser un número mayor o igual a 0';
    }

    if (form.currency !== 'ARS' && parsedBalance > 0) {
      const parsedExchangeRate = Number.parseFloat(exchangeRate);
      if (!exchangeRate || parsedExchangeRate <= 0 || Number.isNaN(parsedExchangeRate)) {
        nextErrors.exchangeRate = 'Ingresá la cotización del día';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const exchangeRatePayload =
        form.currency !== 'ARS' && exchangeRate ? { exchangeRate: Number.parseFloat(exchangeRate) } : {};
      const account = await createAccount({
        name: form.name.trim(),
        type: form.type as AccountType,
        currency: form.currency as Currency,
        balance: parsedBalance || 0,
        ...exchangeRatePayload,
      });

      if (form.currency !== 'ARS' && exchangeRate) {
        saveExchangeRate(form.currency, exchangeRate);
      }

      addCreatedAccount(account);
      setExchangeRate('');
      setForm(resetForm());
    } catch (err) {
      setError(getErrorMessage(err, 'Error al crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  const canContinue = createdAccounts.length > 0;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-app">Tus cuentas</h2>
      <p className="mt-1 text-sm text-app-muted">
        Agregá las cuentas que usás: banco, efectivo o tarjeta. Podés sumar más después.
      </p>

      {createdAccounts.length > 0 && (
        <div className="mt-4 space-y-2">
          {createdAccounts.map((account) => (
            <div key={account.id} className="panel-muted flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-app">{account.name}</p>
                <p className="text-xs text-app-muted">
                  {accountTypeLabels[account.type]} · {account.currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingExisting ? (
        <div className="mt-4 text-sm text-app-soft">Cargando cuentas...</div>
      ) : (
        <form onSubmit={handleAdd} className="mt-5 space-y-3">
          <p className="text-sm font-medium text-app-muted">
            {createdAccounts.length === 0 ? 'Agregá tu primera cuenta' : 'Agregar otra cuenta'}
          </p>

          <MessageBanner message={error} />

          <Input
            label="Nombre"
            value={form.name}
            onChange={set('name')}
            placeholder="Ej: Banco Nación, Efectivo"
            error={errors.name}
          />

          <Select
            label="Tipo"
            value={form.type}
            onChange={set('type')}
            options={accountTypeOptions}
          />

          <Select
            label="Moneda"
            value={form.currency}
            onChange={(e) => {
              set('currency')(e);
              setExchangeRate('');
            }}
            options={currencyOptions}
          />

          <Input
            label="Saldo inicial"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.balance}
            onChange={set('balance')}
            placeholder="0.00"
            error={errors.balance}
          />

          <ExchangeRateInput
            currency={form.currency}
            value={exchangeRate}
            onChange={(val) => {
              setExchangeRate(val);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.exchangeRate;
                return next;
              });
            }}
            amount={form.balance}
            error={errors.exchangeRate}
          />

          <Button type="submit" variant="secondary" loading={loading} className="w-full">
            <Wallet className="h-4 w-4" />
            Agregar cuenta
          </Button>
        </form>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <Button variant="secondary" onClick={goToPrevStep}>
          Atrás
        </Button>
        <Button onClick={goToNextStep} disabled={!canContinue}>
          Siguiente
        </Button>
      </div>
      {!canContinue && (
        <p className="mt-2 text-center text-xs text-app-soft">
          Agregá al menos una cuenta para continuar
        </p>
      )}
    </div>
  );
}
