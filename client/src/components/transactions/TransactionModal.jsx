import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { createTransaction, updateTransaction } from '../../services/transactions.js';
import { getAccounts } from '../../services/accounts.js';
import { getCategories } from '../../services/categories.js';
import { useTransactionModal } from '../../context/TransactionModalContext.jsx';
import clsx from 'clsx';

const typeLabels = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

export default function TransactionModal() {
  const { isOpen, editData, onSuccess, closeModal } = useTransactionModal();
  const isEdit = !!editData;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([getAccounts(), getCategories()]).then(([acc, cat]) => {
      setAccounts(acc);
      setCategories(cat);
    });
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setType(editData.type);
      setAmount(String(editData.amount));
      setAccountId(editData.accountId);
      setCategoryId(editData.categoryId);
      setTransferTo(editData.transferTo || '');
      setDate(editData.date?.split('T')[0] || '');
      setDescription(editData.description || '');
    } else {
      setType('expense');
      setAmount('');
      setAccountId('');
      setCategoryId('');
      setTransferTo('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
    setError('');
  }, [editData, isOpen]);

  const filteredCategories = categories.filter(c =>
    type === 'transfer' ? true : c.type === type
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = {
        type,
        amount: parseFloat(amount),
        accountId,
        categoryId,
        date,
        description: description || undefined,
        transferTo: type === 'transfer' ? transferTo : undefined,
      };
      if (isEdit) {
        await updateTransaction(editData.id, data);
      } else {
        await createTransaction(data);
      }
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title={isEdit ? 'Editar transacción' : 'Nueva transacción'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {typeLabels.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium transition-colors',
                type === t.value
                  ? 'bg-accent-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />

        <Select
          label="Cuenta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Seleccionar cuenta"
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
          required
        />

        {type === 'transfer' && (
          <Select
            label="Cuenta destino"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            placeholder="Seleccionar cuenta destino"
            options={accounts.filter(a => a.id !== accountId).map(a => ({ value: a.id, label: a.name }))}
            required
          />
        )}

        <Select
          label="Categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          placeholder="Seleccionar categoría"
          options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
          required
        />

        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle de la transacción"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={closeModal}>
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
