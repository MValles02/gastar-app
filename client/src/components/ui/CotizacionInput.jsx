import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Input from './Input.jsx';
import { getExchangeRates } from '../../services/exchange-rates.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const LAST_USED_KEY = 'cotizacion_last_used';

export function saveCotizacion(currency, value) {
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}');
    localStorage.setItem(LAST_USED_KEY, JSON.stringify({ ...stored, [currency]: value }));
  } catch {
    // ignore storage errors
  }
}

export default function CotizacionInput({
  currency,
  value,
  onChange,
  amount,
  error,
  disabled,
  skipFetch,
}) {
  const { user } = useAuth();
  const [rates, setRates] = useState(null);
  const [ratesFetching, setRatesFetching] = useState(false);
  const [ratesSource, setRatesSource] = useState(null);

  useEffect(() => {
    if (!currency || currency === 'ARS') {
      setRates(null);
      setRatesSource(null);
      return;
    }
    if (skipFetch) return;

    setRatesFetching(true);
    getExchangeRates(currency)
      .then((fetchedRates) => {
        setRates(fetchedRates);
        setRatesSource('api');
        const preferred =
          user?.cotizacionPreference === 'oficial' ? fetchedRates.oficial : fetchedRates.blue;
        onChange(String(preferred));
      })
      .catch(() => {
        try {
          const stored = JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}');
          if (stored[currency]) {
            onChange(String(stored[currency]));
            setRatesSource('localStorage');
          }
        } catch {
          // ignore parse errors
        }
      })
      .finally(() => setRatesFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, skipFetch]);

  if (!currency || currency === 'ARS') return null;

  const parsedCotizacion = Number.parseFloat(value);
  const parsedAmount = Number.parseFloat(amount);

  return (
    <div>
      <Input
        label={`Cotización (1 ${currency} = ? ARS)`}
        type="number"
        inputMode="decimal"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ratesFetching ? 'Obteniendo cotización...' : 'Ej: 1200'}
        disabled={disabled || ratesFetching}
        error={error}
      />
      {ratesSource === 'api' && rates && (
        <p className="mt-1 text-xs text-app-muted">
          Blue: {formatCurrency(rates.blue)} · Oficial: {formatCurrency(rates.oficial)} ·
          Actualizado automáticamente
        </p>
      )}
      {ratesSource === 'localStorage' && value && (
        <p className="mt-1 text-xs text-app-muted">
          Último valor usado: {formatCurrency(parsedCotizacion)}
        </p>
      )}
      {value && amount != null && parsedCotizacion > 0 && parsedAmount > 0 && (
        <p className="mt-1 text-xs text-app-muted">
          = {formatCurrency(parsedAmount * parsedCotizacion)}
        </p>
      )}
    </div>
  );
}

CotizacionInput.propTypes = {
  currency: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  error: PropTypes.string,
  disabled: PropTypes.bool,
  skipFetch: PropTypes.bool,
};
