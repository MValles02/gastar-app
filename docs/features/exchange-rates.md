# Exchange Rates

The exchange rate feature provides real-time USD and EUR rates to the frontend, which pre-fills the `cotizacion` field when creating transactions or accounts in non-ARS currencies. This feature is specific to Argentine users, where the difference between the "blue" (parallel) and "oficial" (official) USD rates is significant.

---

## Files

- `server/src/routes/exchange-rates.routes.js`
- `server/src/services/exchange-rate.service.js`
- `client/src/pages/Profile.jsx` — cotizacionPreference setting
- `server/src/validators/auth.validators.js` — `updateProfileSchema` for the preference

---

## API Endpoint

### `GET /api/exchange-rates?currency=USD|EUR`

Requires authentication.

**Query params:**
| Param | Values | Description |
|-------|--------|-------------|
| `currency` | `USD` or `EUR` | Which currency to fetch rates for |

**Response:**
```json
{
  "data": {
    "currency": "USD",
    "blue": 1290.00,
    "oficial": 1050.00
  }
}
```

For EUR, `blue` and `oficial` are the same value (the euro rate from dolarapi.com doesn't have a blue/oficial distinction).

---

## Data Source

Rates are fetched from **dolarapi.com**:

| Rate | Endpoint |
|------|---------|
| USD blue | `https://dolarapi.com/v1/dolares/blue` |
| USD oficial | `https://dolarapi.com/v1/dolares/oficial` |
| EUR | `https://dolarapi.com/v1/dolares/euro` |

The service reads the `venta` (sell) price from each response. This is the rate users would pay to acquire USD/EUR, which is appropriate for recording expenses in foreign currency.

---

## Caching

Rates are cached **in memory** (a `Map` on the service module) for **5 minutes**. The cache key is the currency string (`"USD"` or `"EUR"`).

```js
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

If the cache is fresh, the API request returns immediately without calling dolarapi.com. If stale or missing, it fetches fresh data, updates the cache, and returns.

**Important:** The cache lives in the Node.js process memory. It resets on server restart and is not shared between multiple server instances (not relevant with the current single-server deployment, but would matter with horizontal scaling).

---

## User Preference: `cotizacionPreference`

Users can choose whether the app pre-fills the `cotizacion` field with the **blue** or **oficial** rate when creating transactions or accounts in USD.

- Default: `"blue"`
- Options: `"blue"` | `"oficial"`
- Stored on the `User` model as `cotizacionPreference`
- Updated via `PATCH /api/auth/me` with `{ cotizacionPreference: "blue" | "oficial" }`

The preference is available in `AuthContext` as `user.cotizacionPreference`. The transaction composer and account modal read this value to decide which rate to pre-fill.

### Setting in Profile

The Profile page (`/profile`) shows two buttons ("Blue" / "Oficial") for toggling the preference. The active button is highlighted. Changes are saved immediately on click.

---

## How Exchange Rates Are Used in the UI

When a user selects a non-ARS currency in the transaction composer or account modal:
1. The frontend calls `GET /api/exchange-rates?currency=USD` (or EUR)
2. It reads `user.cotizacionPreference` from `AuthContext`
3. Pre-fills the `cotizacion` input with `rates[preference]` (e.g., `rates.blue`)
4. The user can override the pre-filled value manually

The `cotizacion` is then stored with the transaction, locking in the rate at the time of recording.

---

## Adding a New Currency

To add support for a new currency (e.g., BRL):

1. Add `BRL` to the `currency` enum in:
   - `server/src/validators/account.validators.js` (`createAccountSchema` and `updateAccountSchema`)
   - Any frontend currency select options
2. Add the exchange rate source to `exchange-rate.service.js`:
   - Add the endpoint URL
   - Handle it in `fetchRates(currency)`
3. Update the `querySchema` in `exchange-rates.routes.js` to allow `BRL`
4. Update the frontend to offer BRL as a currency option in `AccountModal` and the transaction composer

---

## Known Limitations

- The cache is in-process memory only (no Redis, no shared cache)
- Only one external API source (`dolarapi.com`) — no fallback if it goes down
- EUR has no blue/oficial distinction (both values are the same from dolarapi.com)
