import { useState, useEffect } from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import Input from '../../ui/Input.jsx';
import Button from '../../ui/Button.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';
import { createAccount, getAccounts } from '../../../services/accounts.js';

const typeOptions = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversión' },
];

const typeLabels = Object.fromEntries(typeOptions.map(o => [o.value, o.label]));

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

  // Pre-populate with accounts already created outside this wizard session
  useEffect(() => {
    if (createdAccounts.length > 0) {
      setLoadingExisting(false);
      return;
    }
    getAccounts()
      .then(accounts => {
        accounts.forEach(acc => addCreatedAccount(acc));
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Ingresá un nombre para la cuenta';
    if (isNaN(parseFloat(form.balance)) || parseFloat(form.balance) < 0) {
      newErrors.balance = 'El saldo debe ser un número mayor o igual a 0';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
      setError(err.response?.data?.error || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const canContinue = createdAccounts.length > 0;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tus cuentas</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Agregá las cuentas que usás: banco, efectivo, tarjeta. Podés añadir más después.
      </p>

      {/* Created accounts list */}
      {createdAccounts.length > 0 && (
        <div className="mt-4 space-y-2">
          {createdAccounts.map(acc => (
            <div
              key={acc.id}
              className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{acc.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabels[acc.type]} · {acc.currency}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingExisting ? (
        <div className="mt-4 text-sm text-gray-400">Cargando cuentas...</div>
      ) : (
        <form onSubmit={handleAdd} className="mt-5 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {createdAccounts.length === 0 ? 'Agregá tu primera cuenta' : 'Agregar otra cuenta'}
          </p>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <Input
            label="Nombre"
            value={form.name}
            onChange={set('name')}
            placeholder="Ej: Banco Nación, Efectivo"
            error={errors.name}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select
              value={form.type}
              onChange={set('type')}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            >
              {typeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Moneda</label>
            <select
              value={form.currency}
              onChange={set('currency')}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            >
              <option value="ARS">ARS — Peso argentino</option>
              <option value="USD">USD — Dólar estadounidense</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>

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
        <p className="mt-2 text-center text-xs text-gray-400">
          Agregá al menos una cuenta para continuar
        </p>
      )}
    </div>
  );
}
