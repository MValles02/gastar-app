# Accounts

Accounts represent the user's financial sources: bank accounts, cash on hand, credit cards, investments, etc. Each account stores a balance in its native currency and an ARS-equivalent balance for cross-currency aggregation.

---

## Files

- `server/src/routes/accounts.routes.js`
- `server/src/validators/account.validators.js`
- `client/src/pages/Accounts.jsx`
- `client/src/components/accounts/AccountCard.jsx` ← canonical component
- `client/src/components/accounts/AccountModal.jsx`
- `client/src/services/accounts.js`

### Known code debt

`client/src/components/general/AccountCard.jsx` is a duplicate component that should be unified with `components/accounts/AccountCard.jsx`. Until this is resolved, always use `components/accounts/AccountCard.jsx` for new work.

---

## Account Types

| Value | Label (ES) |
|-------|-----------|
| `checking` | Cuenta corriente |
| `savings` | Caja de ahorro |
| `credit_card` | Tarjeta de crédito |
| `cash` | Efectivo |
| `investment` | Inversión |

Defined as a Prisma enum `AccountType` and as labels in `client/src/constants/accountTypes.js`.

## Supported Currencies

`ARS`, `USD`, `EUR`. Defined in the Zod validator. Adding a new currency requires updating the validator, the exchange rate service, and the frontend composer.

---

## API Endpoints

All require authentication.

### `GET /api/accounts`

Returns all accounts belonging to the authenticated user, ordered by name.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Caja de ahorro",
      "type": "savings",
      "balance": "15000.00",
      "balanceArs": "15000.00",
      "currency": "ARS"
    }
  ]
}
```

### `POST /api/accounts`

**Request:**
```json
{
  "name": "string (max 50)",
  "type": "checking | savings | credit_card | cash | investment",
  "currency": "ARS | USD | EUR",   // optional, defaults to ARS
  "balance": "number",              // optional, defaults to 0
  "cotizacion": "number"            // required if currency != ARS and balance > 0
}
```

**Validation rules:**
- `cotizacion` is required if `currency !== 'ARS'` and `balance > 0` (needed to compute initial `balanceArs`)
- `cotizacion` is ignored for ARS accounts

**Balance initialization:**
- ARS account: `balanceArs = balance`
- Non-ARS account with cotizacion: `balanceArs = balance * cotizacion`
- Non-ARS account with no cotizacion (balance = 0): `balanceArs = 0`

**Response:** 201 with `{ data: account }`

### `PUT /api/accounts/:id`

Updates account metadata. Only fields sent in the body are updated.

**Request:**
```json
{
  "name": "string",          // optional
  "type": "...",             // optional
  "currency": "ARS | USD | EUR",  // optional
  "cotizacion": "number"     // required if changing currency to non-ARS
}
```

**Currency change behavior:**
- Changing to ARS: `balanceArs` is recalculated as `existing.balance` (native units become ARS)
- Changing to non-ARS: `balanceArs` is recalculated as `existing.balance * cotizacion`
- No currency change: `balanceArs` is NOT recalculated (known bug — see below)

**Response:** `{ data: account }`

### `DELETE /api/accounts/:id`

**Known bug:** Currently, accounts with associated transactions cannot be deleted (returns 400). The correct behavior should be to cascade-delete all associated transactions and reverse their balance effects — this is not yet implemented. Pending fix.

**Response (current behavior):**
- 400 if account has transactions: `"No se puede eliminar una cuenta con transacciones asociadas"`
- 200 if no transactions: `{ data: { message: "Cuenta eliminada" } }`

---

## Balance Mechanics

Account balances are **never set directly** after creation. They are maintained by the transaction engine, which uses Prisma's `increment` operator to atomically apply deltas. See [Transaction Engine](../architecture/transaction-engine.md) for full details.

Every account has two balances:

- `balance` — native currency (e.g., USD 500 for a USD account)
- `balanceArs` — ARS equivalent for aggregation and reports

Both are updated atomically on every transaction create, update, and delete.

---

## Known Issues

### `balanceArs` not recalculated on non-currency edits

When editing an account's name or type (with no currency change), `balanceArs` is not touched. This is correct. However, there is a subtle bug: if `balance` somehow diverges from `balanceArs` (e.g., due to a manual DB edit), editing the account will not correct it. A future improvement could recalculate `balanceArs` from the transaction history on demand.

### Account deletion not implemented for accounts with transactions

See the DELETE endpoint section above.

---

## Frontend

The `Accounts` page (`client/src/pages/Accounts.jsx`) shows:

1. A metric strip with "Cuentas activas" (count) and "Balance consolidado" (sum of all `balanceArs`)
2. A list of `AccountCard` components with edit/delete actions
3. An `AccountModal` for create/edit

The `AccountModal` fetches the current exchange rate via `GET /api/exchange-rates?currency=USD` (or EUR) when a non-ARS currency is selected, pre-filling the cotizacion field with the user's preferred rate (blue or oficial).

When an account is successfully saved or deleted, the page calls `triggerRefresh()` from `TransactionModalContext` so the Dashboard also refreshes its balance overview.

---

## How to Add a New Account Type

1. Add the new value to `AccountType` enum in `server/prisma/schema.prisma`
2. Run `npm run db:migrate` and `npm run db:generate`
3. Add the label to `client/src/constants/accountTypes.js`
4. Update the Zod schema in `server/src/validators/account.validators.js`
5. Update the `Select` options in `AccountModal`
