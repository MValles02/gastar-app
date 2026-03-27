const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

const DOLAR_API_BASE = 'https://dolarapi.com/v1';

const ENDPOINTS = {
  USD: {
    blue: `${DOLAR_API_BASE}/dolares/blue`,
    oficial: `${DOLAR_API_BASE}/dolares/oficial`,
  },
  EUR: {
    euro: `${DOLAR_API_BASE}/dolares/euro`,
  },
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`dolarapi.com responded with ${response.status}`);
  }
  return response.json();
}

async function fetchRates(currency) {
  if (currency === 'USD') {
    const [blueData, oficialData] = await Promise.all([
      fetchJson(ENDPOINTS.USD.blue),
      fetchJson(ENDPOINTS.USD.oficial),
    ]);
    return {
      blue: Number(blueData.venta),
      oficial: Number(oficialData.venta),
    };
  }

  if (currency === 'EUR') {
    const euroData = await fetchJson(ENDPOINTS.EUR.euro);
    const rate = Number(euroData.venta);
    return { blue: rate, oficial: rate };
  }

  throw new Error(`Currency not supported: ${currency}`);
}

export async function getExchangeRates(currency) {
  const cached = cache.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { blue: cached.blue, oficial: cached.oficial };
  }

  const rates = await fetchRates(currency);
  cache.set(currency, { ...rates, fetchedAt: Date.now() });
  return rates;
}
