import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

const typeOptions = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit_card', label: 'Tarjeta de credito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversion' },
];

export default function AccountModal({ isOpen, onClose, onSubmit, account }) {
  const isEdit = !!account;
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [currency, setCurrency] = useState('ARS');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');
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
  }, [account, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isEdit
        ? { name, type, currency }
        : { name, type, currency, balance: parseFloat(balance) || 0 };
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Banco Nacion, Efectivo"
          required
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
        />
        <Input
          label="Moneda"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="ARS"
        />
        {!isEdit && (
          <Input
            label="Saldo inicial"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
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
