import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import MessageBanner from '../ui/MessageBanner.jsx';
import CotizacionInput, { saveCotizacion } from '../ui/CotizacionInput.jsx';
import { getErrorMessage } from '../../utils/errors.js';
import { accountShape } from '../../utils/propTypes.js';
import { accountTypeOptions } from '../../constants/accountTypes.js';

export default function AccountModal({ isOpen, onClose, onSubmit, account }) {
  const isEdit = Boolean(account);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [currency, setCurrency] = useState('ARS');
  const [balance, setBalance] = useState('0');
  const [cotizacion, setCotizacion] = useState('');
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

    setCotizacion('');
    setError('');
    setErrors({});
  }, [account, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextErrors = {};
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
      if (needsCotizacion && (!cotizacion || parsedCotizacion <= 0 || Number.isNaN(parsedCotizacion))) {
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
      const cotizacionPayload = currency !== 'ARS' && cotizacion
        ? { cotizacion: Number.parseFloat(cotizacion) }
        : {};
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => { setCurrency(e.target.value); setCotizacion(''); }}
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
          onChange={(val) => { setCotizacion(val); setErrors(prev => { const next = { ...prev }; delete next.cotizacion; return next; }); }}
          amount={!isEdit ? balance : undefined}
          error={errors.cotizacion}
        />
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

AccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  account: accountShape,
};
