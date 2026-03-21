import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import MessageBanner from '../ui/MessageBanner.jsx';
import { createTransaction, updateTransaction } from '../../services/transactions.js';
import { getAccounts } from '../../services/accounts.js';
import { getCategories } from '../../services/categories.js';
import { useTransactionModal } from '../../context/TransactionModalContext.jsx';
import { getErrorMessage } from '../../utils/errors.js';

const typeLabels = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

export default function TransactionModal() {
  const { isOpen, editData, triggerRefresh, closeModal } = useTransactionModal();
  const isEdit = Boolean(editData);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([getAccounts(), getCategories()])
      .then(([accountOptions, categoryOptions]) => {
        setAccounts(accountOptions);
        setCategories(categoryOptions);
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'No pudimos cargar las opciones para esta transacción.'));
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

      const today = new Date();
      setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      setDescription('');
    }

    setError('');
    setErrors({});
  }, [editData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextErrors = {};

    if (!amount || parseFloat(amount) <= 0 || Number.isNaN(parseFloat(amount))) {
      nextErrors.amount = 'Ingresá un monto válido mayor a 0';
    }
    if (!accountId) {
      nextErrors.accountId = 'Seleccioná una cuenta';
    }
    if (!categoryId) {
      nextErrors.categoryId = 'Seleccioná una categoría';
    }
    if (type === 'transfer' && !transferTo) {
      nextErrors.transferTo = 'Seleccioná la cuenta destino';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
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
      triggerRefresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar la transacción'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title={isEdit ? 'Editar transacción' : 'Nueva transacción'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={error} />

        <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          {typeLabels.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium transition-colors',
                type === option.value
                  ? 'bg-accent-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Input
          label="Monto"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          error={errors.amount}
        />

        <Select
          label="Cuenta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Seleccionar cuenta"
          options={accounts.map(account => ({ value: account.id, label: account.name }))}
          error={errors.accountId}
        />

        {type === 'transfer' && (
          <Select
            label="Cuenta destino"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            placeholder="Seleccionar cuenta destino"
            options={accounts.filter(account => account.id !== accountId).map(account => ({ value: account.id, label: account.name }))}
            error={errors.transferTo}
          />
        )}

        <Select
          label="Categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          placeholder="Seleccionar categoría"
          options={categories.map(category => ({ value: category.id, label: category.name }))}
          error={errors.categoryId}
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

