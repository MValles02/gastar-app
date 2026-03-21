import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CalendarDays,
  Tag,
  Wallet,
} from 'lucide-react';
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
  { value: 'expense', label: 'Gasto', icon: ArrowDownCircle, tone: 'text-danger' },
  { value: 'income', label: 'Ingreso', icon: ArrowUpCircle, tone: 'text-success' },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight, tone: 'text-accent-600 dark:text-accent-300' },
];

function FieldHint({ children }) {
  return <p className="text-xs text-accent-600">{children}</p>;
}

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
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Editar transacción' : 'Nueva transacción'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <MessageBanner message={error} />

        <div className="panel-muted space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-app-muted">Tipo</p>
            <div className="flex flex-col overflow-hidden rounded-soft border border-border-default sm:flex-row">
              {typeLabels.map((option) => {
                const Icon = option.icon;
                const active = type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={clsx(
                      'flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors sm:flex-1',
                      active
                        ? 'bg-accent-600 text-white'
                        : 'bg-surface-muted text-app-muted hover:bg-surface-strong hover:text-app'
                    )}
                  >
                    <Icon className={clsx('h-3.5 w-3.5', active ? 'text-white' : option.tone)} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <FieldHint>Elegí entre gasto, ingreso o transferencia entre cuentas</FieldHint>
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

          <div className="space-y-1">
            <Select
              label="Cuenta"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Seleccionar cuenta"
              options={accounts.map(account => ({ value: account.id, label: account.name }))}
              error={errors.accountId}
            />
            <FieldHint>
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" />
                Seleccioná la cuenta afectada
              </span>
            </FieldHint>
          </div>

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

          <div className="space-y-1">
            <Select
              label="Categoría"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="Seleccionar categoría"
              options={categories.map(category => ({ value: category.id, label: category.name }))}
              error={errors.categoryId}
            />
            <FieldHint>
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                Elegí la categoría del movimiento
              </span>
            </FieldHint>
          </div>

          <div className="space-y-1">
            <Input
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <FieldHint>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Definí cuándo impactó el movimiento
              </span>
            </FieldHint>
          </div>

          <Input
            label="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle de la transacción"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
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
