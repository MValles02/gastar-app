# gastar-app — Data Model

## Money & rate representation

- All monetary amounts are stored as **integer minor units** (bigint cents). E.g. US$ 1.234,56 → `123456`.
- Manually entered ARS amounts and all exchange rates are whole pesos (multiples of 100), validated on input; amounts imported from Mercado Pago keep their cents. ARS displays without decimals (rounded half-up).
- Exchange rate is stored as an **integer hundredths** value (`rate × 100`, bigint). E.g. rate "1 USD = 1500 ARS" → `150000`.
- A movement's currency is **derived from its account** (`financial_accounts.currency`); it is not stored on the movement.

### Conversion formulas (integer arithmetic, half-up rounding)

```
USD → ARS: dest_cents = round_half_up(amount_cents × rate_hundredths / 10000) × 100   (whole pesos)
ARS → USD: dest_cents = round_half_up(amount_cents × 100 / rate_hundredths)
```

- Same-currency transfer: no rate; `dest_cents = amount_cents`.
- "Half-up" = round `.5` away from zero (standard rounding), applied to the division result before storing as an integer.

## Naming note

- Better Auth owns its own tables (`user`, `session`, `account`, `verification`) and manages their schema. Password-reset tokens live in `verification`; email-verification links are stateless signed tokens. Migration 0003 marked pre-existing users as verified.
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
| `kind` | enum('income','outcome','transfer'), nullable | null = both; never `transfer` (CHECK `categories_kind_check`) |
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
| `occurred_at` | timestamptz | Buenos Aires local midnight of the movement date (date-only; see invariant 18) |
| `description` | text | short; max 60 chars (firm rule) |
| `amount` | bigint, > 0 | minor units |
| `account_id` | fk → `financial_accounts.id` | origin account |
| `category_id` | fk → `categories.id`, nullable | required for income/outcome, null for transfer |
| `destination_account_id` | fk → `financial_accounts.id`, nullable | transfer only |
| `destination_amount` | bigint, nullable, > 0 | transfer only, minor units |
| `exchange_rate` | bigint, nullable, > 0 | transfer only, hundredths, only when currencies differ |
| `recurring_id` | fk → `recurring_movements.id`, nullable | set when the movement logs a recurring rule; ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### DB-level CHECK constraints

- `type IN ('income','outcome')` ⇒ `category_id IS NOT NULL` AND `destination_account_id IS NULL` AND `destination_amount IS NULL` AND `exchange_rate IS NULL`.
- `type = 'transfer'` ⇒ `category_id IS NULL` AND `destination_account_id IS NOT NULL` AND `destination_account_id <> account_id` AND `destination_amount IS NOT NULL`.

#### App-level constraints (span tables, cannot be a single-row CHECK)

- `exchange_rate IS NOT NULL` **iff** `account.currency <> destination_account.currency` for a transfer.
- If the two accounts share a currency, `destination_amount = amount`.
- A movement cannot be created with an archived account or category, and new selections while editing exclude archived ones. Exception: editing a movement keeps an archived account or category it already references (`resolveMovement`'s `keep` argument in `src/lib/server/movements.ts`).
- A movement or recurring rule cannot select a category whose non-null `kind` differs from its type; editing may keep the category it already has (`keep` argument; a recurring payment keeps its rule's category). `kind` does not affect category net, Reportes or Inicio, which aggregate by `movements.type`.

#### Foreign keys

- `account_id`, `destination_account_id` → `financial_accounts.id`, **ON DELETE RESTRICT**.
- `category_id` → `categories.id`, **ON DELETE RESTRICT**.
- RESTRICT is intentional: it is the mechanism that forces the UI to offer Archive instead of delete for referenced rows.

#### Indexes

- `(account_id, occurred_at)`
- `(destination_account_id)`
- `(category_id)`
- `(user_id, occurred_at)`
- `(recurring_id)`

### `recurring_movements`

Monthly recurring incomes or bills. Logging one creates a normal movement linked by `movements.recurring_id`; a rule is paid in a month when a linked movement exists in that month. Its currency is its account's currency.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `type` | enum('income','outcome','transfer') | never `transfer` (CHECK) |
| `description` | varchar(60) | |
| `amount` | bigint, > 0 | minor units |
| `account_id` | fk → `financial_accounts.id` | ON DELETE CASCADE |
| `category_id` | fk → `categories.id` | ON DELETE CASCADE |
| `day_of_month` | smallint | 1–31 (CHECK); clamped to the month's last day when reading |
| `archived_at` | timestamptz, nullable | null = active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Index: `(user_id)`.

### `spending_plans`

At most one plan per user and currency. The currency is stored because a plan has no account.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `currency` | enum('ARS','USD') | |
| `extra_income` | bigint, >= 0, default 0 | deprecated: not read or written; dropped in a later release |
| `savings` | bigint, >= 0, default 0 | minor units |
| `savings_percent` | integer, nullable, CHECK 0..10000 | percent x 100 (1000 = 10 %); set → savings = `floor(income / 1_000_000 * percent_x100)` whole units, computed at read time from the income; null → the `savings` amount |
| `month` | varchar(7), nullable | null = every month; `YYYY-MM` = that month only (CHECK) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, currency)`.

### `plan_category_limits`

Optional monthly limit per category.

| Column | Type | Notes |
|---|---|---|
| `plan_id` | fk → `spending_plans.id` | ON DELETE CASCADE |
| `category_id` | fk → `categories.id` | ON DELETE CASCADE |
| `amount` | bigint, > 0 | minor units |

Constraints: PK `(plan_id, category_id)`.

### `mp_import_items`

Approval inbox for Mercado Pago activity. Imports land here, never on `movements`; approving an item creates the movement and links it.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `account_id` | fk → `financial_accounts.id` | ON DELETE RESTRICT |
| `external_key` | text | idempotency key from the source |
| `kind` | text | CHECK in ('payment','account_fund','yield','payout','merchant_payout','refund','other'); `merchant_payout` is a payout with an `EXTERNAL_REFERENCE` (payment at a merchant), `payout` one without (transfer or withdrawal) |
| `status` | enum('pending','approved','rejected') | default 'pending' |
| `occurred_at` | timestamptz | |
| `amount` | bigint, > 0 | exact net, minor units |
| `is_credit` | boolean | direction of the money |
| `source_id` | text | |
| `raw_description` | text | |
| `counterparty_id`, `counterparty_nickname`, `merchant`, `operation_type`, `poi_type` | text, nullable | |
| `movement_id` | fk → `movements.id`, nullable | ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, external_key)`. Index: `(user_id, status, occurred_at)`.

Approving is one transaction: a conditional `pending` → `approved` update (zero rows = already handled, nothing written), the movement insert, `movement_id`, and the rule upsert. Rejecting is a conditional `pending` → `rejected` update; the row stays so its external key is never re-imported.

### `mp_import_rules`

Rules learned from approved items, used to pre-fill later ones.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `match_kind` | enum('counterparty','merchant','kind') | |
| `match_value` | text | |
| `type` | enum('income','outcome','transfer') | |
| `category_id` | fk → `categories.id`, nullable | ON DELETE CASCADE |
| `counter_account_id` | fk → `financial_accounts.id`, nullable | ON DELETE CASCADE |
| `description` | varchar(60), nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, match_kind, match_value)`; CHECK `mp_import_rules_shape_check`: `transfer` ⇒ `counter_account_id` set and `category_id` null; otherwise `category_id` set.

Approval upserts one rule on the item's strongest key: `counterparty` (`operation_type = money_transfer` with a counterparty id) > `merchant` (trimmed, lowercased) > `kind` (only yield, payout, merchant_payout, account_fund); a `refund` item has no key; no key, no rule. Pre-fill is computed at read time from the first matching key in that order and ignored when its target is archived or its type does not fit the item's direction.

### `mp_sync_state`

One row per synced account.

| Column | Type | Notes |
|---|---|---|
| `account_id` | pk, fk → `financial_accounts.id` | ON DELETE CASCADE |
| `synced_until` | timestamptz, nullable | |
| `running_since` | timestamptz, nullable | |
| `last_run_at` | timestamptz, nullable | |
| `last_error` | text, nullable | error code only |
| `report_balance` | bigint, nullable | deprecated: not read or written since the settlement report (no balance); dropped in a later release |
| `report_balance_at` | timestamptz, nullable | deprecated, as `report_balance` |

### `mp_connections`

One row per user who linked Mercado Pago (OAuth).

| Column | Type | Notes |
|---|---|---|
| `user_id` | pk, fk → `user.id` | ON DELETE CASCADE |
| `account_id` | uuid, nullable, fk → `financial_accounts.id` | ON DELETE SET NULL; null = linked, no receiving account chosen yet |
| `mp_user_id` | text | `user_id` of the token response; not unique |
| `access_token` | text | encrypted |
| `refresh_token` | text, nullable | encrypted; null when MP grants no `offline_access` |
| `expires_at` | timestamptz | |
| `needs_reconnect` | boolean | default false |
| `created_at`, `updated_at` | timestamptz | |

Encryption: tokens are AES-256-GCM ciphertext, `v1:` + base64(iv(12) | tag(16) | ct), with AAD = `user_id`, keyed by `MP_TOKEN_KEY`. They are never logged or sent to the client.

## Derived formulas

### Plan figures (per plan currency, per month; computed in `src/lib/server/plan.ts`)

All inputs are in the plan's currency; nothing is converted or summed across currencies.

```
income      = sum(active recurring incomes)
forSpending = income - sum(active recurring bills) - savings
available   = forSpending - spent        -- spent: see below
perDay      = available > 0 ? floor(available / daysLeft / unit) * unit : 0
              -- daysLeft = clamp(days - elapsed + 1, 1, days); unit = 100 for ARS, 1 for USD
unassigned  = forSpending - sum(limits)
```

- Spent: outcomes in the current Buenos Aires month on accounts in the plan currency (archived accounts included), transfers excluded; outcomes linked to an active rule are excluded (the rule is already in the bills), outcomes linked to an inactive or deleted rule are counted.
- Status: `over` if `available < 0`; `warn` if `spent / forSpending > elapsed / days`; otherwise `ok`. When `forSpending <= 0`, any spending counts as fully spent (share 1), so status is `warn`, or `over` if `available < 0`; no spending gives `ok`. Each limit shows its own progress the same way.
- Savings: if `savings_percent` is set, savings = `floor(income * percent_x100 / 1_000_000) * 100` (whole units), computed at read time and never relied on from storage; saves also write that computed amount to `savings` for rollout compatibility (older releases read only `savings`). If null, savings is the `savings` amount.
- Rule status: `paid` if a linked movement exists in the month; otherwise `overdue` for any past month, or by due day (clamped to the month's length) within the current/future month: `overdue` / `today` / `upcoming`.

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
- `canAccessRecurring(userId, r = recurringMovements)` and `recurringOwnedBy(userId)`: the same pair for `recurring_movements.user_id`.
- `canAccessPlan(userId, p = spendingPlans)` and `planOwnedBy(userId)`: the same pair for `spending_plans.user_id`. Category limits have no owner column; they are reached only by joining their plan.
- `canAccessImport(userId, i = mpImportItems)` and `importOwnedBy(userId)`: the same pair for `mp_import_items.user_id`.
- `canAccessMpConnection(userId, c = mpConnections)` and `mpConnectionOwnedBy(userId)`: the same pair for `mp_connections.user_id`.
- `canAccessImportRule(userId, r = mpImportRules)` and `importRuleOwnedBy(userId)`: the same pair for `mp_import_rules.user_id`. `mp_sync_state` has no owner column; it is reached only by joining its account.

`movements.user_id` is the movement's own owner column; reads, updates and deletes go through `canAccessMovement`, inserts through `movementOwnedBy`.

## Shared-accounts extension path (future)

- Not implemented in MVP. Ownership today is a single `owner_id` column on `financial_accounts`.
- **All** access checks (read/write to an account or its movements) must go through one server-side ownership rule, implemented in `src/lib/server/access.ts` (see Ownership helpers). No other code path may check ownership directly.
- Future extension: add an `account_members(account_id, user_id, role)` table and change only that helper's implementation — no schema change to `movements` or `categories` should be required.
- Decision: a shared account's environment owns its own, separate set of categories — not the owner's or any member's personal categories. Movements on a shared account may only use that shared environment's categories; personal categories remain personal. Tables for this are not designed now.

## Invariants

1. Every monetary column (`initial_balance`, `amount`, `destination_amount`) is stored in integer minor units (bigint).
2. `exchange_rate`, when present, is stored as integer hundredths (bigint) and is `> 0`.
3. Conversion rounding is always half-up, applied via the integer formulas above: to whole pesos into ARS, to cents into USD.
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
18. `movements.occurred_at` is the Buenos Aires local midnight of the movement's date; readers derive the date in Buenos Aires and tolerate non-midnight legacy values.
19. Amounts imported from Mercado Pago keep their cents. Editing a movement may keep its existing amount (even non-whole); new or changed manual ARS amounts, initial balances and all exchange rates are multiples of 100 (whole pesos). Non-whole values are displayed rounded half-up.
20. Recurring-rule and plan amounts are in the account's or plan's currency and are never summed across currencies. ARS values are whole pesos, validated in the actions.
21. Plan figures (income, for spending, available, per day, status, limit progress) are computed at read time, never persisted. The plan setup wizard writes step by step (savings creates the plan, each limit and rule is saved on its own screen, the last step sets the plan month); nothing is staged across steps. Creating a movement with "Repetir cada mes" writes the rule and the movement (linked by `recurring_id`) in one transaction.
22. Deletion: hard-deleting an unreferenced account or category cascades to its recurring rules and plan limits. Deleting a recurring rule sets the linked movements' `recurring_id` to NULL, so history is kept. Archiving does not touch plan rows; rules on an archived account or category are inactive (excluded from plan sums, cannot be logged).
