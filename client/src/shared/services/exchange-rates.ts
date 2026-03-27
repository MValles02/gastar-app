import api from './api.js';

export interface ExchangeRatesResponse {
  blue: number;
  official: number;
}

export async function getExchangeRates(currency?: string): Promise<ExchangeRatesResponse> {
  const { data } = await api.get('/exchange-rates', { params: { currency } });
  return data.data;
}
