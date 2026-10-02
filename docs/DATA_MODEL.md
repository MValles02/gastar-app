# gastar-app — Data Model

## Money & rate representation

- All monetary amounts are stored as **integer minor units** (bigint cents). E.g. ARS 1.234,56 → `123456`.
- Exchange rate is stored as an **integer hundredths** value (`rate × 100`, bigint). E.g. rate "1 USD = 1500,25 ARS" → `150025`.
- A movement's currency is **derived from its account** (`financial_accounts.currency`); it is not stored on the movement.

### Conversion formulas (integer arithmetic, half-up rounding)

```
USD → ARS: dest_cents = round_half_up(amount_cents × rate_hundredths / 100)
ARS → USD: dest_cents = round_half_up(amount_cents × 100 / rate_hundredths)
```

- Same-currency transfer: no rate; `dest_cents = amount_cents`.
- "Half-up" = round `.5` away from zero (standard rounding), applied to the division result before storing as an integer.

## Naming note

- Better Auth owns its own tables (`user`, `session`, `account`, `verification`) and manages their schema.
- Because Better Auth already uses the table name `account`, the finance-domain table is named `financial_accounts` at the DB/schema level. Application code, routes, and UI may still refer to it as "account" — this is a deliberate naming split, not an inconsistency.

## Tables

### `financial_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `owner_id` | fk → `user.id` | single owner (see Shared-accounts extension path) |
| `name` | text | |
| `currency` | enum('ARS','USD') | |
| `initial_balance` | bigint | minor units; may be negative |
| `icon` | text | |
| `color` | text | |
| `archived_at` | timestamptz, nullable | null = active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: currency is immutable once the account has ≥1 movement (app-level rule, see Invariants).

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `name` | text | |
| `color` | text | |
| `archived_at` | timestamptz, nullable | null = active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, name)`.

### `movements`

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | author |
| `type` | enum('income','outcome','transfer') | |
| `occurred_at` | timestamptz | |
| `description` | text | short; max 60 chars (firm rule) |
| `amount` | bigint, > 0 | minor units |
| `account_id` | fk → `financial_accounts.id` | origin account |
| `category_id` | fk → `categories.id`, nullable | required for income/outcome, null for transfer |
| `destination_account_id` | fk → `financial_accounts.id`, nullable | transfer only |
| `destination_amount` | bigint, nullable, > 0 | transfer only, minor units |
| `exchange_rate` | bigint, nullable, > 0 | transfer only, hundredths, only when currencies differ |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### DB-level CHECK constraints

- `type IN ('income','outcome')` ⇒ `category_id IS NOT NULL` AND `destination_account_id IS NULL` AND `destination_amount IS NULL` AND `exchange_rate IS NULL`.
- `type = 'transfer'` ⇒ `category_id IS NULL` AND `destination_account_id IS NOT NULL` AND `destination_account_id <> account_id` AND `destination_amount IS NOT NULL`.

#### App-level constraints (span tables, cannot be a single-row CHECK)

- `exchange_rate IS NOT NULL` **iff** `account.currency <> destination_account.currency` for a transfer.
- If the two accounts share a currency, `destination_amount = amount`.
- A movement cannot be created with an archived account or category, and new selections while editing exclude archived ones. Exception: editing a movement keeps an archived account or category it already references (`resolveMovement`'s `keep` argument in `src/lib/server/movements.ts`).

#### Foreign keys

- `account_id`, `destination_account_id` → `financial_accounts.id`, **ON DELETE RESTRICT**.
- `category_id` → `categories.id`, **ON DELETE RESTRICT**.
- RESTRICT is intentional: it is the mechanism that forces the UI to offer Archive instead of delete for referenced rows.

#### Indexes

- `(account_id, occurred_at)`
- `(destination_account_id)`
- `(category_id)`
- `(user_id, occurred_at)`

## Derived formulas

### Account balance (always computed, never stored)

```
balance = initial_balance
        + sum(incomes.amount)
        - sum(outcomes.amount)
        - sum(transfers_out.amount)          -- this account as origin
        + sum(transfers_in.destination_amount) -- this account as destination
```

### Category net (per currency, per period)

```
category_net = sum(outcomes.amount) - sum(incomes.amount)   -- within that category, currency, period
```

- Top 3 = categories with the highest positive `category_net`.
- `percentage = category_net / sum(all positive category_net values in period & currency)`.
- Categories with `category_net <= 0` are excluded.

## Ownership helpers

All live in `src/lib/server/access.ts`. They are SQL conditions (Drizzle `SQL`), not per-row predicates, so list, aggregate and detail queries all use the same rule by putting the condition in `where`. A detail route checks a single row by querying with `where(and(eq(id), canAccess...(userId)))` and treating no row as not found; there is no separate per-row function.

- `canAccessAccount(userId, account = financialAccounts)`: `account.owner_id = userId`. Accepts an alias.
- `ownedBy(userId)`: insert-side counterpart, sets `owner_id`.
- `canAccessMovement(userId, origin = financialAccounts)`: `movements.user_id = userId` AND `canAccessAccount(userId, origin)`. The caller must inner-join the origin account.
- `movementOwnedBy(userId)`: insert-side counterpart, sets `movements.user_id`.
- `canAccessCategory(userId, cat = categories)` and `categoryOwnedBy(userId)`: the same pair for `categories.user_id`.

`movements.user_id` is the movement's own owner column; reads, updates and deletes go through `canAccessMovement`, inserts through `movementOwnedBy`.

## Shared-accounts extension path (future)

- Not implemented in MVP. Ownership today is a single `owner_id` column on `financial_accounts`.
- **All** access checks (read/write to an account or its movements) must go through one server-side ownership rule, implemented in `src/lib/server/access.ts` (see Ownership helpers). No other code path may check ownership directly.
- Future extension: add an `account_members(account_id, user_id, role)` table and change only that helper's implementation — no schema change to `movements` or `categories` should be required.
- Decision: a shared account's environment owns its own, separate set of categories — not the owner's or any member's personal categories. Movements on a shared account may only use that shared environment's categories; personal categories remain personal. Tables for this are not designed now.

## Invariants

1. Every monetary column (`initial_balance`, `amount`, `destination_amount`) is stored in integer minor units (bigint).
2. `exchange_rate`, when present, is stored as integer hundredths (bigint) and is `> 0`.
3. Conversion rounding is always half-up to 2 decimals, applied via the integer formulas above.
4. A movement's currency is never stored; it is derived from `account_id`'s `financial_accounts.currency`.
5. `income` and `outcome` movements always have a non-null `category_id` and null transfer-only fields.
6. `transfer` movements always have a non-null `destination_account_id` different from `account_id`, a non-null `destination_amount`, and a null `category_id`.
7. `transfer.exchange_rate` is non-null if and only if origin and destination accounts have different currencies.
8. `transfer.destination_amount = transfer.amount` when origin and destination accounts share a currency.
9. `financial_accounts.currency` cannot change once the account is referenced by ≥1 movement.
10. No movement may select an archived `financial_accounts` or `categories` row at creation or edit time; movements created before archiving keep their reference, and editing such a movement may keep the archived account or category it already references (new selections still exclude archived ones).
11. `financial_accounts` and `categories` rows referenced by any movement cannot be deleted (enforced by `ON DELETE RESTRICT`); only archiving is available for them.
12. Unreferenced `financial_accounts` and `categories` rows may be hard-deleted.
13. `movements` rows are always hard-deletable (no restriction).
14. Account balance and category net are always computed at read time, never persisted as stored/cached columns.
15. Transfers are excluded from month-balance and category-net calculations.
16. `categories.(user_id, name)` is unique.
17. All account/movement access is authorized through a single ownership-check helper, to keep future shared-account support a one-place change.
