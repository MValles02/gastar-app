import { useEffect, useState } from 'react';
import ResourceModal from '../../../shared/components/compound/ResourceModal.js';
import Input from '../../../shared/components/ui/Input.js';
import Select from '../../../shared/components/ui/Select.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import ExchangeRateInput, { saveExchangeRate } from '../../../shared/components/ui/ExchangeRateInput.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { accountTypeOptions } from '../../../shared/constants/accountTypes.js';
import type { Account } from '../../../shared/types/domain.types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  account?: Account | null;
}

export default function AccountModal({ isOpen, onClose, onSubmit, account }: Props): JSX.Element {
  const isEdit = Boolean(account);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [currency, setCurrency] = useState('ARS');
  const [balance, setBalance] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCurrency(account.currency);
      setBalance(String(account.balance));
    } else {
      setName('');
      setType('checking');
      setCurrency('ARS');
      setBalance('0');
    }

    setExchangeRate('');
    setError('');
    setErrors({});
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors: Record<string, string> = {};
    const parsedBalance = Number.parseFloat(balance);

    if (!name.trim()) {
      nextErrors.name = 'Ingresá un nombre para la cuenta';
    }

    if (!isEdit && balance !== '' && (Number.isNaN(parsedBalance) || parsedBalance < 0)) {
      nextErrors.balance = 'El saldo debe ser un número mayor o igual a 0';
    }

    if (currency !== 'ARS') {
      const needsExchangeRate = isEdit || parsedBalance > 0;
      const parsedExchangeRate = Number.parseFloat(exchangeRate);
      if (
        needsExchangeRate &&
        (!exchangeRate || parsedExchangeRate <= 0 || Number.isNaN(parsedExchangeRate))
      ) {
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
        currency !== 'ARS' && exchangeRate ? { exchangeRate: Number.parseFloat(exchangeRate) } : {};
      const data = isEdit
        ? { name, type, currency, ...exchangeRatePayload }
        : { name, type, currency, balance: parsedBalance || 0, ...exchangeRatePayload };

      await onSubmit(data);

      if (currency !== 'ARS' && exchangeRate) {
        saveExchangeRate(currency, exchangeRate);
      }

      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResourceModal
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <MessageBanner message={error} />
      <Input
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Banco Nación, Efectivo"
        error={errors.name}
      />
      <Select
        label="Tipo"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={accountTypeOptions}
      />
      <Select
        label="Moneda"
        value={currency}
        onChange={(e) => {
          setCurrency(e.target.value);
          setExchangeRate('');
        }}
        options={[
          { value: 'ARS', label: 'ARS - Peso argentino' },
          { value: 'USD', label: 'USD - Dólar estadounidense' },
          { value: 'EUR', label: 'EUR - Euro' },
        ]}
      />
      {!isEdit && (
        <Input
          label="Saldo inicial"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
          error={errors.balance}
        />
      )}
      <ExchangeRateInput
        currency={currency}
        value={exchangeRate}
        onChange={(val) => {
          setExchangeRate(val);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.exchangeRate;
            return next;
          });
        }}
        amount={!isEdit ? balance : undefined}
        error={errors.exchangeRate}
      />
    </ResourceModal>
  );
}
