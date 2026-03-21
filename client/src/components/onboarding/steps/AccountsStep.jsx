import { useEffect, useState } from 'react';
import { CheckCircle2, Wallet } from 'lucide-react';
import Input from '../../ui/Input.jsx';
import Select from '../../ui/Select.jsx';
import Button from '../../ui/Button.jsx';
import MessageBanner from '../../ui/MessageBanner.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';
import { createAccount, getAccounts } from '../../../services/accounts.js';
import { getErrorMessage } from '../../../utils/errors.js';

const typeOptions = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversión' },
];

const currencyOptions = [
  { value: 'ARS', label: 'ARS - Peso argentino' },
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
];

const typeLabels = Object.fromEntries(typeOptions.map(option => [option.value, option.label]));

function resetForm() {
  return { name: '', type: 'checking', currency: 'ARS', balance: '0' };
}

export default function AccountsStep() {
  const { goToNextStep, goToPrevStep, createdAccounts, addCreatedAccount } = useOnboarding();
  const [form, setForm] = useState(resetForm());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (createdAccounts.length > 0) {
      setLoadingExisting(false);
      return;
    }

    getAccounts()
      .then(accounts => {
        accounts.forEach(account => addCreatedAccount(account));
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No pudimos cargar tus cuentas actuales.'));
      })
      .finally(() => setLoadingExisting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm(current => ({ ...current, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Ingresá un nombre para la cuenta';
    if (Number.isNaN(parseFloat(form.balance)) || parseFloat(form.balance) < 0) {
      nextErrors.balance = 'El saldo debe ser un número mayor o igual a 0';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const account = await createAccount({
        name: form.name.trim(),
        type: form.type,
        currency: form.currency,
        balance: parseFloat(form.balance) || 0,
      });
      addCreatedAccount(account);
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
          {createdAccounts.map(account => (
            <div
              key={account.id}
              className="panel-muted flex items-center gap-3 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-app">{account.name}</p>
                <p className="text-xs text-app-muted">{typeLabels[account.type]} · {account.currency}</p>
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
            options={typeOptions}
          />

          <Select
            label="Moneda"
            value={form.currency}
            onChange={set('currency')}
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
