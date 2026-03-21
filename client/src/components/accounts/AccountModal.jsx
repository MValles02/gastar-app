import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import MessageBanner from '../ui/MessageBanner.jsx';
import { getErrorMessage } from '../../utils/errors.js';

const typeOptions = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversion' },
];

export default function AccountModal({ isOpen, onClose, onSubmit, account }) {
  const isEdit = Boolean(account);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [currency, setCurrency] = useState('ARS');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
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

    setError('');
    setErrors({});
  }, [account, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'Ingresá un nombre para la cuenta';
    }

    if (!isEdit && balance !== '' && (Number.isNaN(parseFloat(balance)) || parseFloat(balance) < 0)) {
      nextErrors.balance = 'El saldo debe ser un número mayor o igual a 0';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const data = isEdit
        ? { name, type, currency }
        : { name, type, currency, balance: parseFloat(balance) || 0 };

      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={error} />
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Banco Nacion, Efectivo"
          error={errors.name}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
        />
        <Select
          label="Moneda"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
