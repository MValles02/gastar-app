# Transaction Engine

The transaction engine is the most critical part of the backend. It is responsible for keeping account balances in sync with transactions at all times. Every create, update, and delete operation on a transaction must go through this engine.

All balance mutations happen inside a Prisma `$transaction` block, guaranteeing atomicity. If any step fails, the entire operation rolls back.

---

## Files

- `server/src/services/transaction.service.js` — balance apply/reverse logic
- `server/src/services/transaction-rules.js` — partial update merge logic (`getEffectiveTransaction`)
- `server/src/routes/transactions.routes.js` — routes that orchestrate the above

---

## Core Concepts

### Two balances per account

Every account stores two balances:

- `balance` — the native currency balance (e.g., USD 500 for a USD account)
- `balanceArs` — the ARS equivalent (e.g., ARS 500,000 if USD/ARS = 1000)

All reports and dashboards aggregate `balanceArs` so they always work in a single currency regardless of account mix.

### `amount` vs `amountArs` on transactions

Every transaction also stores two amounts:

- `amount` — in the source account's native currency, always positive
- `amountArs` — ARS equivalent at the time of the transaction
- `cotizacion` — the exchange rate used (null for ARS accounts)

For ARS accounts: `amountArs === amount` and `cotizacion === null`.
For non-ARS accounts: `amountArs = amount * cotizacion`.

The `cotizacion` field records the rate at the time of the transaction, so historical reports remain accurate even as rates change.

---

## Balance Delta Rules

```
income   → source balance increases (+amount, +amountArs)
expense  → source balance decreases (-amount, -amountArs)
transfer → source balance decreases (-amount, -amountArs)
           destination balance increases (see cross-currency logic below)
```

Implemented in `getBalanceDelta(type, amount)`:

```js
switch (type) {
  case 'income':   return +amount;
  case 'expense':  return -amount;
  case 'transfer': return -amount;   // source side
}
```

---

## `applyTransactionBalances`

Called when a transaction is **created** or after it is **updated** (after reversal).

```js
applyTransactionBalances(tx, transaction, sourceAccount, destAccount)
```

Steps:
1. Compute native delta and ARS delta using `getBalanceDelta`
2. Apply delta to source account (`balance` and `balanceArs`)
3. If transfer: credit destination account

### Cross-currency transfer logic

When transferring between accounts of different currencies, the ARS amount acts as the bridge:

```js
const destNativeCredit =
  destAccount.currency === sourceAccount.currency
    ? amount         // same currency: credit same native amount
    : amountArs;     // different currency: credit ARS equivalent as native units
```

Example: Transfer USD 100 (cotizacion 1000) to an ARS account:
- Source USD account: -100 USD, -100,000 ARS
- Dest ARS account: +100,000 ARS, +100,000 ARS

Example: Transfer ARS 100,000 to a USD account (cotizacion 1000):
- Source ARS account: -100,000 ARS, -100,000 ARS
- Dest USD account: +100,000 "native units", +100,000 ARS

This is intentional: when currencies differ, `amountArs` is used as the bridge value and credited as-is in the destination's native units. The result only makes sense when the user has set the correct `cotizacion` — the system trusts the user-provided rate to represent the equivalence between the two accounts.

---

## `reverseTransactionBalances`

Called before a transaction is **updated** or **deleted**. It applies the exact inverse of what `applyTransactionBalances` would do for the existing transaction.

```js
reverseTransactionBalances(tx, existingTransaction, sourceAccount, destAccount)
```

This "undoes" the old transaction so the account balances return to their pre-transaction state. After reversal, either the new transaction is applied (update) or nothing more happens (delete).

---

## `adjustBalance`

Low-level helper used by both apply and reverse:

```js
adjustBalance(tx, accountId, nativeDelta, arsDelta)
```

Uses Prisma's `increment` operator to atomically add the delta to both balance fields. Never reads the current balance — always uses increments to avoid race conditions.

---

## Transaction Update Flow

Updates are the most complex operation. The full flow in `PUT /api/transactions/:id`:

1. Parse and validate the partial update payload with `updateTransactionSchema`
2. Recompute `amountArs` if `amount` or `cotizacion` changed
3. Call `getEffectiveTransaction(existing, data)` to merge partial fields onto the existing record
4. Validate that the effective source/destination accounts exist and belong to the user
5. Validate that the source account's currency requirement for `cotizacion` is met
6. Fetch the **original** source and destination accounts (for reversal)
7. Inside a Prisma `$transaction`:
   a. Reverse the old transaction's balance effects
   b. Write the updated transaction record
   c. Apply the new transaction's balance effects

This two-step (reverse then apply) approach means the engine never needs to compute diffs — it simply undoes the old state and applies the new state.

---

## `getEffectiveTransaction`

`server/src/services/transaction-rules.js`

Takes the existing transaction record and the partial update payload, and returns a fully-merged transaction object that the engine can use for validation and balance application.

```js
getEffectiveTransaction(existing, data) → mergedTransaction
```

Rules:
- Each field defaults to `existing[field]` if not present in `data`
- `transferTo` has special handling: if `data.transferTo === undefined`, it keeps `existing.transferTo`; if explicitly set (even to `null`), it uses `data.transferTo`
- If the effective type is NOT `transfer`, `transferTo` is forced to `null` — this prevents orphaned `transferTo` values when changing a transfer to an income/expense

---

## Prisma `$transaction` usage

All balance mutations are wrapped in a Prisma interactive transaction:

```js
await prisma.$transaction(async (tx) => {
  // use tx.account.update, tx.transaction.create, etc.
  // if anything throws, everything rolls back
});
```

Never call `prisma.account.update` for balance changes outside of a `$transaction`. If a balance update succeeds but the transaction record write fails (or vice versa), the data becomes inconsistent.

---

## Adding a New Transaction Type

If a new transaction type is ever added (beyond `income`, `expense`, `transfer`):

1. Add it to the `TransactionType` enum in `server/prisma/schema.prisma`
2. Run `npm run db:migrate` and `npm run db:generate`
3. Update `getBalanceDelta` in `transaction.service.js` to define how it affects balances
4. Update `getEffectiveTransaction` in `transaction-rules.js` if it has special field merging rules (like `transfer` does with `transferTo`)
5. Update Zod schemas in `server/src/validators/transaction.validators.js`
6. Update frontend type labels in `client/src/utils/formatters.js`
7. Update `TransactionComposerUI` and related frontend components
