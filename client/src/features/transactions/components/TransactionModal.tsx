import { useEffect, useState } from 'react';
import { CalendarDays, Tag, Wallet } from 'lucide-react';
import Modal from '../../../shared/components/ui/Modal.js';
import Input from '../../../shared/components/ui/Input.js';
import Select from '../../../shared/components/ui/Select.js';
import Button from '../../../shared/components/ui/Button.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import {
  ComposerHintLine,
  TransactionComposerPanel,
  TransactionTypeSwitch,
} from './TransactionComposerUI.js';
import { createTransaction, updateTransaction } from '../services/transactions.js';
import { getAccounts } from '../../accounts/services/accounts.js';
import { getCategories } from '../../categories/services/categories.js';
import { useTransactionModal } from '../../../shared/contexts/TransactionModalContext.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { typeOptions } from '../../../shared/constants/transactionTypes.js';
import CotizacionInput, { saveCotizacion } from '../../../shared/components/ui/CotizacionInput.js';
import type { Account, Category, TransactionType } from '../../../shared/types/domain.types.js';

export default function TransactionModal(): JSX.Element {
  const { isOpen, editData, triggerRefresh, closeModal } = useTransactionModal();
  const isEdit = Boolean(editData);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [date, setDate] = useState('');
  const [cotizacion, setCotizacion] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([getAccounts(), getCategories()])
      .then(([accountOptions, categoryOptions]) => {
        setAccounts(accountOptions);
        setCategories(categoryOptions);
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, 'No pudimos cargar las opciones para esta transacción.'));
      });
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setType(editData.type);
      setAmount(String(editData.amount));
      setAccountId(editData.accountId);
      setCategoryId(editData.categoryId ?? '');
      setTransferTo(editData.transferTo ?? '');
      setDate(editData.date?.split('T')[0] ?? '');
      setDescription(editData.description ?? '');
      setCotizacion(editData.cotizacion ? String(editData.cotizacion) : '');
    } else {
      setType('expense');
      setAmount('');
      setAccountId('');
      setCategoryId('');
      setTransferTo('');

      const today = new Date();
      setDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      );
      setDescription('');
      setCotizacion('');
    }

    setError('');
    setErrors({});
  }, [editData, isOpen]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateField = (field: string) => {
    if (field === 'amount') {
      const parsed = Number.parseFloat(amount);
      if (!amount || parsed <= 0 || Number.isNaN(parsed)) {
        setErrors((prev) => ({ ...prev, amount: 'Ingresá un monto válido mayor a 0' }));
      }
    }
    if (field === 'accountId' && !accountId) {
      setErrors((prev) => ({ ...prev, accountId: 'Seleccioná una cuenta' }));
    }
    if (field === 'categoryId' && !categoryId) {
      setErrors((prev) => ({ ...prev, categoryId: 'Seleccioná una categoría' }));
    }
    if (field === 'transferTo' && type === 'transfer' && !transferTo) {
      setErrors((prev) => ({ ...prev, transferTo: 'Seleccioná la cuenta destino' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors: Record<string, string> = {};
    const parsedAmount = Number.parseFloat(amount);

    if (!amount || parsedAmount <= 0 || Number.isNaN(parsedAmount)) {
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
    if (selectedAccount?.currency && selectedAccount.currency !== 'ARS') {
      const parsedCotizacion = Number.parseFloat(cotizacion);
      if (!cotizacion || parsedCotizacion <= 0 || Number.isNaN(parsedCotizacion)) {
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
      const data = {
        type: type as TransactionType,
        amount: parsedAmount,
        accountId,
        categoryId,
        date,
        description: description || undefined,
        transferTo: type === 'transfer' ? transferTo : undefined,
        cotizacion:
          selectedAccount?.currency && selectedAccount.currency !== 'ARS'
            ? Number.parseFloat(cotizacion)
            : undefined,
      };

      if (isEdit && editData) {
        await updateTransaction(editData.id, data);
      } else {
        await createTransaction(data);
      }

      // Save last used cotizacion for fallback
      if (selectedAccount?.currency && selectedAccount.currency !== 'ARS' && cotizacion) {
        saveCotizacion(selectedAccount.currency, cotizacion);
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

        <TransactionComposerPanel>
          <div className="space-y-1">
            <p className="text-xs font-medium text-app-muted">Tipo</p>
            <TransactionTypeSwitch options={typeOptions} value={type} onChange={setType} />
            <ComposerHintLine>
              Elegí entre gasto, ingreso o transferencia entre cuentas
            </ComposerHintLine>
          </div>

          <Input
            label="Monto"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              clearFieldError('amount');
            }}
            onBlur={() => validateField('amount')}
            placeholder="0.00"
            error={errors.amount}
          />

          <div className="space-y-1">
            <Select
              label="Cuenta"
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                clearFieldError('accountId');
              }}
              onBlur={() => validateField('accountId')}
              placeholder="Seleccionar cuenta"
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              error={errors.accountId}
            />
            <ComposerHintLine icon={Wallet}>Seleccioná la cuenta afectada</ComposerHintLine>
          </div>

          <CotizacionInput
            currency={selectedAccount?.currency}
            value={cotizacion}
            onChange={(val) => {
              setCotizacion(val);
              clearFieldError('cotizacion');
            }}
            amount={amount}
            error={errors.cotizacion}
            skipFetch={isEdit}
          />

          {type === 'transfer' && (
            <Select
              label="Cuenta destino"
              value={transferTo}
              onChange={(e) => {
                setTransferTo(e.target.value);
                clearFieldError('transferTo');
              }}
              onBlur={() => validateField('transferTo')}
              placeholder="Seleccionar cuenta destino"
              options={accounts
                .filter((account) => account.id !== accountId)
                .map((account) => ({ value: account.id, label: account.name }))}
              error={errors.transferTo}
            />
          )}

          <div className="space-y-1">
            <Select
              label="Categoría"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                clearFieldError('categoryId');
              }}
              onBlur={() => validateField('categoryId')}
              placeholder="Seleccionar categoría"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
              error={errors.categoryId}
            />
            <ComposerHintLine icon={Tag}>Elegí la categoría del movimiento</ComposerHintLine>
          </div>

          <div className="space-y-1">
            <Input
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <ComposerHintLine icon={CalendarDays}>
              Definí cuándo impactó el movimiento
            </ComposerHintLine>
          </div>

          <Input
            label="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle de la transacción"
          />
        </TransactionComposerPanel>

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
