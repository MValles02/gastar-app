# Transactions

Transactions are the core data entity. Every financial event — income, expense, or transfer between accounts — is recorded as a transaction. Creating, updating, or deleting a transaction always atomically updates the account balance(s) involved.

---

## Files

- `server/src/routes/transactions.routes.js`
- `server/src/services/transaction.service.js` — balance apply/reverse
- `server/src/services/transaction-rules.js` — partial update merge
- `server/src/validators/transaction.validators.js`
- `client/src/pages/Transactions.jsx`
- `client/src/components/transactions/` — TransactionList, TransactionFilters, TransactionModal, TransactionComposerUI
- `client/src/services/transactions.js`

---

## Transaction Types

| Type | Description | Balance effect |
|------|-------------|----------------|
| `income` | Money coming in | Source account balance increases |
| `expense` | Money going out | Source account balance decreases |
| `transfer` | Money moved between own accounts | Source decreases, destination increases |

---

## API Endpoints

All require authentication.

### `GET /api/transactions`

Returns paginated transactions. All filters are optional.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `accountId` | UUID | Filter by source account |
| `categoryId` | UUID | Filter by category |
| `type` | `income \| expense \| transfer` | Filter by type |
| `from` | date string | Filter by date >= from |
| `to` | date string | Filter by date <= to |
| `page` | integer (min 1, default 1) | Page number |
| `limit` | integer (1–100, default 20) | Items per page |

**Response:**
```json
{
  "data": {
    "transactions": [...],
    "total": 42,
    "page": 1,
    "totalPages": 3
  }
}
```

Each transaction includes nested `category` (`{ id, name, icon }`), `account` (`{ id, name }`), and `transferToAccount` (`{ id, name }` or null).

Ordered by `date DESC`, then `createdAt DESC` (most recent first; ties broken by creation time).

### `POST /api/transactions`

**Request:**
```json
{
  "accountId": "uuid",
  "categoryId": "uuid",
  "type": "income | expense | transfer",
  "amount": "number (positive)",
  "cotizacion": "number (positive)",  // required if account currency != ARS
  "description": "string (max 200)",  // optional
  "date": "YYYY-MM-DD",
  "transferTo": "uuid"                // required if type = transfer
}
```

**Validation rules:**
- `amount` must be > 0
- `cotizacion` is required if the source account's currency is not ARS; silently dropped (not a validation error) for ARS accounts — the server always sets `cotizacion = null` for ARS accounts regardless of what is sent
- `transferTo` is required if `type === 'transfer'`
- `transferTo` must differ from `accountId`
- Both `accountId` and `categoryId` must belong to the authenticated user
- `transferTo` account must also belong to the authenticated user

**Balance computation:**
- For ARS accounts: `amountArs = amount`, `cotizacion = null`
- For non-ARS accounts: `amountArs = amount * cotizacion`

**Response:** 201 with `{ data: transaction }`

### `PUT /api/transactions/:id`

Partial update — only send the fields you want to change.

**Request:** Same fields as POST, all optional. `transferTo` can be set to `null` explicitly.

**`amountArs` recomputation:** If either `amount` or `cotizacion` is provided in the update, `amountArs` is automatically recomputed from the effective values. You never need to send `amountArs` directly.

**Update flow:**
1. Merge partial payload with existing record via `getEffectiveTransaction`
2. Validate merged result
3. Reverse old balance effects
4. Apply new balance effects
5. Update the transaction record

All three steps (reverse + update record + apply) happen inside a single Prisma `$transaction`.

See [Transaction Engine](../architecture/transaction-engine.md) for full details.

**Response:** `{ data: transaction }`

### `DELETE /api/transactions/:id`

Reverses the transaction's balance effects and deletes the record inside a single Prisma `$transaction`.

**Response:** `{ data: { message: "Transacción eliminada" } }`

---

## Ownership Validation

Every route validates that the resources referenced belong to the authenticated user:

- `accountId` must be an account owned by `req.userId`
- `categoryId` must be a category owned by `req.userId`
- `transferTo` (if present) must be an account owned by `req.userId`
- On update/delete, the transaction itself must belong to an account owned by `req.userId`

This check is done via `findFirst({ where: { id, userId } })` — a missing record returns a 404 with an appropriate Spanish error message.

---

## Frontend

### Transactions Page (`/transactions`)

Shows a filterable, paginated list of all transactions. Filters: account, category, type, date range. Pagination buttons appear when `totalPages > 1`.

- Edit button: opens the transaction composer modal (`openModal(tx)`) pre-filled with the transaction's data
- Delete button: shows a destructive confirmation dialog, then calls `deleteTransaction(id)` and reloads

### Transaction Composer Modal

The global transaction composer is controlled by `TransactionModalContext`. It can be opened:
- From the FAB (floating action button) — opens in "create" mode
- From the edit button on any transaction — opens in "edit" mode with the transaction pre-filled

After a successful save, the modal calls `triggerRefresh()` so the Transactions page, Dashboard, and any other subscriber reloads.

### Refresh pattern

Any page that shows transaction-derived data should subscribe to `refreshKey` from `TransactionModalContext`:

```js
const { refreshKey } = useTransactionModal();
useEffect(() => { load(); }, [load, refreshKey]);
```

---

## How to Add a New Transaction Type

See the [Transaction Engine](../architecture/transaction-engine.md#adding-a-new-transaction-type) doc.
