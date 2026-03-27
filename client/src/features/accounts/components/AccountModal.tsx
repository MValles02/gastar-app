import { useEffect, useState } from 'react';
import ResourceModal from '../../../shared/components/compound/ResourceModal.js';
import Input from '../../../shared/components/ui/Input.js';
import Select from '../../../shared/components/ui/Select.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import CotizacionInput, { saveCotizacion } from '../../../shared/components/ui/CotizacionInput.js';
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
  const [cotizacion, setCotizacion] = useState('');
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

    setCotizacion('');
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
      const needsCotizacion = isEdit || parsedBalance > 0;
      const parsedCotizacion = Number.parseFloat(cotizacion);
      if (
        needsCotizacion &&
        (!cotizacion || parsedCotizacion <= 0 || Number.isNaN(parsedCotizacion))
      ) {
        nextErrors.cotizacion = 'Ingresá la cotización del día';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const cotizacionPayload =
        currency !== 'ARS' && cotizacion ? { cotizacion: Number.parseFloat(cotizacion) } : {};
      const data = isEdit
        ? { name, type, currency, ...cotizacionPayload }
        : { name, type, currency, balance: parsedBalance || 0, ...cotizacionPayload };

      await onSubmit(data);

      if (currency !== 'ARS' && cotizacion) {
        saveCotizacion(currency, cotizacion);
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
          setCotizacion('');
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
      <CotizacionInput
        currency={currency}
        value={cotizacion}
        onChange={(val) => {
          setCotizacion(val);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.cotizacion;
            return next;
          });
        }}
        amount={!isEdit ? balance : undefined}
        error={errors.cotizacion}
      />
    </ResourceModal>
  );
}
