const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedRates {
  blue: number;
  official: number;
  fetchedAt: number;
}

const cache = new Map<string, CachedRates>();

const DOLAR_API_BASE = 'https://dolarapi.com/v1';

const ENDPOINTS = {
  USD: {
    blue: `${DOLAR_API_BASE}/dolares/blue`,
    official: `${DOLAR_API_BASE}/dolares/oficial`,
  },
  EUR: {
    euro: `${DOLAR_API_BASE}/dolares/euro`,
  },
};

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`dolarapi.com responded with ${response.status}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

interface Rates {
  blue: number;
  official: number;
}

async function fetchRates(currency: 'USD' | 'EUR'): Promise<Rates> {
  if (currency === 'USD') {
    const [blueData, officialData] = await Promise.all([
      fetchJson(ENDPOINTS.USD.blue),
      fetchJson(ENDPOINTS.USD.official),
    ]);
    return {
      blue: Number(blueData.venta),
      official: Number(officialData.venta),
    };
  }

  if (currency === 'EUR') {
    const euroData = await fetchJson(ENDPOINTS.EUR.euro);
    const rate = Number(euroData.venta);
    return { blue: rate, official: rate };
  }

  throw new Error(`Currency not supported: ${currency}`);
}

export async function getExchangeRates(currency: 'USD' | 'EUR'): Promise<Rates> {
  const cached = cache.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { blue: cached.blue, official: cached.official };
  }

  const rates = await fetchRates(currency);
  cache.set(currency, { ...rates, fetchedAt: Date.now() });
  return rates;
}
