import { useState, useEffect } from 'react';
import { getExchangeRates } from '../services/exchange-rates.js';
import { normalizeError } from '../utils/errors.js';

let cachedRates = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useExchangeRates() {
  const [rates, setRates] = useState(cachedRates);
  const [loading, setLoading] = useState(!cachedRates);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = Date.now();
    if (cachedRates && now - cacheTimestamp < CACHE_TTL_MS) {
      setRates(cachedRates);
      setLoading(false);
      return;
    }
    setLoading(true);
    getExchangeRates()
      .then((res) => {
        cachedRates = res;
        cacheTimestamp = Date.now();
        setRates(cachedRates);
      })
      .catch((err) => setError(normalizeError(err).message))
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading, error };
}
