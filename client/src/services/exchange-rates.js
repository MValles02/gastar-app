import api from './api.js';

export async function getExchangeRates(currency) {
  const { data } = await api.get('/exchange-rates', { params: { currency } });
  return data.data;
}
