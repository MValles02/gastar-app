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
| `recurring_id` | fk → `recurring_movements.id`, nullable | set when the movement is linked to a recurring rule: at creation (decided before the INSERT, same transaction: explicit choice or description match) or later from the movement edit page; ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### DB-level CHECK constraints

- `type IN ('income','outcome')` ⇒ `category_id IS NOT NULL` AND `destination_account_id IS NULL` AND `destination_amount IS NULL` AND `exchange_rate IS NULL`.
- `type = 'transfer'` ⇒ `category_id IS NULL` AND `destination_account_id IS NOT NULL` AND `destination_account_id <> account_id` AND `destination_amount IS NOT NULL`.

#### App-level constraints (span tables, cannot be a single-row CHECK)

- `exchange_rate IS NOT NULL` **iff** `account.currency <> destination_account.currency` for a transfer.
- If the two accounts share a currency, `destination_amount = amount`.
- A movement cannot be created with an archived account or category, and new selections while editing exclude archived ones. Exception: editing a movement keeps an archived account or category it already references (`resolveMovement`'s `keep` argument in `src/lib/server/movements/form.ts`).
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

Monthly recurring incomes or bills. A movement links to a rule through `movements.recurring_id`; a rule is paid in a month when a linked movement exists in that month. Its currency is its account's currency. Invariant: at most one linked movement per rule per local (Buenos Aires) month, enforced in `linkRuleFor` with the rule rows locked (`FOR UPDATE`), not by a constraint. Amount rule: linking a payment (outcome) sets the rule's `amount` to the movement's amount (ARS rounded half-up to whole pesos) when it differs and the movement's month is not earlier than the rule's latest linked month, storing the old value in `previous_amount`; deleting or unlinking the movement that made the change restores it (`unlinkRevert`, same transaction) when no other linked movement is as recent; income rules never change from a link; a manual amount edit clears `previous_amount`. A one-time backfill in `scripts/migrate.js` links the previous and current month's unlinked movements by the same matching (no amount changes); it runs only in the migration that adds `mp_import_rules.recurring_id`.

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
| `previous_amount` | bigint, nullable | amount before the last change that came from a linked charge; CHECK `recurring_movements_previous_amount_positive_check`: null or > 0 |
| `archived_at` | timestamptz, nullable | null = active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Index: `(user_id)`.

### `spending_plans`

One plan per user, in ARS: "the plan" is the user's row with `currency = 'ARS'`. Rows with `currency = 'USD'` were legacy (one plan per currency before migration 0018); migration `0019_drop_legacy_usd_plans.sql` deletes them (their limits cascade). New code never reads or writes them. The unique index on currency or the column itself may go in a later release.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `currency` | enum('ARS','USD') | |
| `extra_income` | bigint, >= 0, default 0 | deprecated: not read or written; dropped in a later release |
| `savings` | bigint, >= 0, default 0 | minor units |
| `savings_percent` | integer, nullable, CHECK 0..10000 | percent x 100 (1000 = 10 %); set → savings = `floor(income / 1_000_000 * percent_x100)` whole units, computed at read time from the income; null → the `savings` amount |
| `month` | varchar(7), nullable | null = every month; `YYYY-MM` = that month only (CHECK) |
| `exchange_rate` | bigint, nullable, CHECK > 0 | manual plan rate (rate x 100, whole pesos); null = the latest ARS↔USD transfer's rate |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, currency)`.

### `plan_category_limits`

Optional monthly limit per category.

| Column | Type | Notes |
|---|---|---|
| `plan_id` | fk → `spending_plans.id` | ON DELETE CASCADE |
| `category_id` | fk → `categories.id` | ON DELETE CASCADE |
| `amount` | bigint, > 0 | minor units, in `currency` |
| `currency` | enum('ARS','USD'), NOT NULL, default 'ARS' | the limit's own currency; the default keeps inserts from the previous release working |

Constraints: PK `(plan_id, category_id)` (one limit per category). Migration 0018 copies legacy USD-plan limits onto the ARS plan with `currency = 'USD'` (an existing ARS limit on the category wins) and gives a user with only a USD plan an ARS plan (same month and percent, savings 0; fixed USD savings are not carried over).

### `mp_import_items`

Approval inbox for imported activity (Mercado Pago, Banco Galicia card statements). Imports land here, never on `movements`; approving an item creates the movement and links it.

| Column | Type | Notes |
|---|---|---|
| `id` | pk | |
| `user_id` | fk → `user.id` | |
| `account_id` | fk → `financial_accounts.id` | ON DELETE RESTRICT |
| `external_key` | text | idempotency key from the source; Galicia: `galicia:<network>:<comprobante>:<cuota>:<date>:<currency>:<signed cents>` (`#n` for the nth identical line of one statement), taxes `galicia:<network>:taxes:<sha256(statement number), 16 hex>:<currency>` |
| `source` | text, default 'mercado_pago' | CHECK in ('mercado_pago','galicia_visa','galicia_mastercard','visa_debit') |
| `kind` | text | CHECK in ('payment','account_fund','yield','payout','merchant_payout','refund','other','card_purchase','card_installment','card_taxes','card_adjustment'); `merchant_payout` is a payout with an `EXTERNAL_REFERENCE` (payment at a merchant), `payout` one without (transfer or withdrawal); the `card_*` kinds come from Galicia statements (`card_adjustment`: the "Diferencia con el resumen" item of a matched alert, key `diff:<statement line key>`); a credit-card alert is an item of source `galicia_visa`, kind `card_purchase`, key `alert:<gmail message id>` |
| `status` | enum('pending','approved','rejected') | default 'pending' |
| `occurred_at` | timestamptz | |
| `amount` | bigint, > 0 | exact net, minor units |
| `is_credit` | boolean | direction of the money |
| `source_id` | text | |
| `raw_description` | text | |
| `counterparty_id`, `counterparty_nickname`, `merchant`, `operation_type`, `poi_type` | text, nullable | Galicia: `merchant` is the raw reference (its rule key is the cleaned name, see Rules) and `source_id` the comprobante (or '') |
| `installment` | text, nullable | Galicia installment lines: the cuota as printed (`05/12`) |
| `alias_key` | text, nullable | the key of the other side of a match between a credit-card alert and a statement line: on the alert item the statement line's key, on a statement item the alert's key (`alert:<id>`); UNIQUE with `user_id` |
| `unmatched_kept_at` | timestamptz, nullable | "Dejar" on "No apareció en el resumen": the alert item leaves that list |
| `movement_id` | fk → `movements.id`, nullable | ON DELETE SET NULL |
| `auto_approved_at` | timestamptz, nullable | set when the approval was automatic; cleared by an undo |
| `auto_approve_blocked` | boolean, default false | the user undid an automatic approval: never auto-approved again |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, external_key)`, `UNIQUE (user_id, alias_key)` (several nulls allowed). Index: `(user_id, status, occurred_at)`.

Approving is one transaction: a conditional `pending` → `approved` update (zero rows = already handled, nothing written), the movement insert, `movement_id`, and the rule upsert. Rejecting is a conditional `pending` → `rejected` update; the row stays so its external key is never re-imported.

Auto-approval (`autoApprovePending(userId)`, source-agnostic, run after each ingest: after the payments and again after the report of a sync run, and on every statement upload) approves, through the same transaction, every pending item whose read-time prefill is a usable rule, skipping `auto_approve_blocked` items; it never writes a rule and an item whose movement fails validation stays pending. It stamps `auto_approved_at`. Undoing an approval (one transaction: delete the unedited movement, item back to `pending`) clears `auto_approved_at` and, when it was set, sets `auto_approve_blocked`.

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
| `recurring_id` | fk → `recurring_movements.id`, nullable | fixed payment items matching this rule link to; ON DELETE SET NULL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE (user_id, match_kind, match_value)`; CHECK `mp_import_rules_shape_check`: `transfer` ⇒ `counter_account_id` set and `category_id` null; otherwise `category_id` set.

Approval upserts one rule on the item's strongest key: `counterparty` (`operation_type = money_transfer` with a counterparty id) > `merchant` (trimmed, lowercased; for card lines the reference cleaned of per-transaction codes, keeping `*` and inner punctuation, with the raw trimmed-lowercased reference as a lookup-only fallback for rules learned before; Mercado Pago keys unchanged) > `kind` (only yield, payout, merchant_payout, account_fund, card_taxes); a `refund` item and a card credit (other than `card_taxes`) have no key; no key, no rule. Pre-fill is computed at read time from the first matching key in that order and ignored when its target is archived or its type does not fit the item's direction.

### `mp_sync_state`

One row per synced account.

| Column | Type | Notes |
|---|---|---|
| `account_id` | pk, fk → `financial_accounts.id` | ON DELETE CASCADE |
| `synced_until` | timestamptz, nullable | |
| `running_since` | timestamptz, nullable | |
| `last_run_at` | timestamptz, nullable | |
| `last_error` | text, nullable | error code only |
| `phase` | text, nullable | step of the running sync |
| `new_items` | integer, nullable | items the current/last run stored |
| `auto_approved` | integer, nullable | items the last run approved automatically |

### `galicia_connections`

One row per user who chose an account for Banco Galicia statements (created on the first pick). The statement PDF itself is never stored.

| Column | Type | Notes |
|---|---|---|
| `user_id` | pk, fk → `user.id` | ON DELETE CASCADE |
| `ars_account_id` | uuid, nullable, fk → `financial_accounts.id` | ON DELETE SET NULL; pesos lines land here (required to upload) |
| `usd_account_id` | uuid, nullable, fk → `financial_accounts.id` | ON DELETE SET NULL; dollar lines land here (required only for statements with dollar lines) |
| `created_at`, `updated_at` | timestamptz | |

An upload writes all its items in one insert (`ON CONFLICT (user_id, external_key) DO NOTHING`), then runs `autoApprovePending`.

### `import_settings`

One row per user who chose "Importar desde" (created on the first choice; no row means not chosen). The one minimum date of every automatic import (Mercado Pago and Gmail alerts); Banco Galicia statements are never filtered by it.

| Column | Type | Notes |
|---|---|---|
| `user_id` | pk, fk → `user.id` | ON DELETE CASCADE |
| `import_from` | timestamptz | local day start; Mercado Pago fetches nothing before it, Gmail alerts before it are not converted to items |
| `updated_at` | timestamptz | |

Without a row the effective day is the earliest Mercado Pago or Gmail-alert item, else 30 days back, never beyond 12 months. Moving it later deletes the pending Mercado Pago items and the pending alert items (not those aliased to a statement line) before it; moving it earlier backfills both sources.

### `card_statements`

One row per Banco Galicia statement uploaded (no PDF content): how many statements of a network closed after an alert tells whether it is "No apareció en el resumen".

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | fk → `user.id` | ON DELETE CASCADE |
| `source` | text | CHECK in ('galicia_visa','galicia_mastercard') |
| `number_hash` | text | SHA-256 prefix of the statement number, as in the taxes key |
| `closing` | date | the statement closing date |
| `created_at` | timestamptz | |

Constraint: `UNIQUE (user_id, source, number_hash)`; an upload inserts it with `ON CONFLICT DO NOTHING` after its items.

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
| `import_from` | timestamptz, nullable | legacy: dual-written with `import_settings.import_from` and read as a fallback; dropped in a follow-up |
| `created_at`, `updated_at` | timestamptz | |

Encryption: tokens are AES-256-GCM ciphertext, `v1:` + base64(iv(12) | tag(16) | ct), with AAD = `user_id`, keyed by `MP_TOKEN_KEY`. They are never logged or sent to the client.

### `gmail_connections`

One row per user who linked Gmail (OAuth, own Google client; the sync reads Visa purchase alerts).

| Column | Type | Notes |
|---|---|---|
| `user_id` | pk, fk → `user.id` | ON DELETE CASCADE |
| `google_account_id` | text | `sub` of the id_token |
| `email` | text | address of the linked Google account (id_token) |
| `access_token` | text | encrypted |
| `refresh_token` | text | encrypted; Google does not rotate it |
| `expires_at` | timestamptz | |
| `needs_reconnect` | boolean | default false; set when Google answers `invalid_grant` or the token cannot be decrypted |
| `sync_cursor` | timestamptz, nullable | newest mail date seen; null until the first run; never moves backwards; each run re-reads 60 s before it |
| `covered_from` | timestamptz, nullable | earliest instant from which mail has been read at least once; a run reads from the "Importar desde" day whenever that day is earlier than this (or this is null), then lowers it; moving the day later leaves it (trimming deletes pending items only, `card_alerts` stay) |
| `sync_running_since` | timestamptz, nullable | the run's lease (taken in one UPDATE; a later run may take over after 15 minutes) |
| `last_run_at` | timestamptz, nullable | |
| `last_error_code` | text, nullable | `reconnect`, `network`, `api` or `parse` (a mail from Visa that did not parse); code only |
| `created_at`, `updated_at` | timestamptz | |

Encryption: same format as `mp_connections` (shared helper), keyed by `GMAIL_TOKEN_KEY`. Unlinking revokes the refresh token at Google (best effort) and deletes the row; deleting the account does the same before its transaction deletes the row.

### `card_alerts`

One row per Visa purchase-alert email, only the parsed fields: the email body, subject, headers and links are never stored or logged.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | fk → `user.id` | ON DELETE CASCADE |
| `gmail_message_id` | text | UNIQUE with `user_id` |
| `network` | text | CHECK 'visa' |
| `last4` | text | CHECK 4 digits |
| `merchant`, `country` | text | |
| `currency` | text | CHECK in ('ARS','USD') |
| `amount` | bigint | minor units of `currency`, > 0 |
| `foreign` | boolean | |
| `transaction_type` | text | "Compra" or another label |
| `received_at` | timestamptz | the message's `internalDate` |
| `import_item_id` | fk → `mp_import_items.id`, nullable | ON DELETE SET NULL; null while the alert waits (unknown or credit card) |
| `created_at` | timestamptz | |

Index `(user_id, network, last4)`.

### `import_cards`

What a card of the alerts is. UNIQUE `(user_id, network, last4)`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | fk → `user.id` | ON DELETE CASCADE |
| `network` | text | CHECK 'visa' |
| `last4` | text | CHECK 4 digits |
| `type` | text | CHECK in ('credit','debit') |
| `ars_account_id`, `usd_account_id` | fk → `financial_accounts.id`, nullable | ON DELETE SET NULL; a debit card needs the pesos account |
| `created_at`, `updated_at` | timestamptz | |

A debit card's alerts become items of the source `visa_debit` ("Visa Débito"), kind `card_purchase` (transaction type "Compra") or `other` (any other type: always a review, learns nothing, never auto-approved), external key `alert:<gmail message id>`, account = the card's account of the alert currency, `merchant` = `raw_description` = the alert's merchant, `occurred_at` = `received_at`. A credit card's alerts become items of the source `galicia_visa` on the accounts of `galicia_connections` (a credit card's own account columns are not used). A credit alert whose statement line is already imported creates no item: its key is stored as that statement item's `alias_key` and `import_item_id` points at the statement item; otherwise the later statement line fills the alert item's `alias_key` (see `docs/scope.md`, "Banco Galicia statements"). Alerts of unknown cards stay in `card_alerts` until the card is set up.

## Derived formulas

### Plan figures (one plan in ARS, per month; computed in `src/lib/server/plan/summary.ts` and `plan/month-plan.ts`)

Figures are in pesos. USD items convert at the plan rate: the manual `spending_plans.exchange_rate` when set, else the latest transfer with an exchange rate and `occurred_at <= now()` (order `occurred_at` desc, `created_at` desc); with no rate, USD items are left out of the totals. Each figure (income, bills, pending bills, spent, variable spent, per-category spending, limits total) is summed per currency first and converted once with `convertAmount` (USD→ARS half up to whole pesos); rows are converted one by one for display only. A limit stays in its own currency: spending in the other currency converts into it. Savings are in ARS; a percentage applies to the total ARS income (USD income converted). Balances and Reportes are never converted.

```
income      = sum(active recurring incomes)
forSpending = income - sum(active recurring bills) - savings
available   = forSpending - spent        -- spent: see below
perDay      = available > 0 ? floor(available / daysLeft / unit) * unit : 0
              -- daysLeft = clamp(days - elapsed + 1, 1, days); unit = 100 (pesos)
```

- Spent: outcomes in the current Buenos Aires month on accounts of both currencies, converted (archived accounts included), transfers excluded; outcomes linked to an active rule are excluded (the rule is already in the bills), outcomes linked to an inactive or deleted rule are counted.
- Status: `over` if `available < 0`; `warn` if `spent / forSpending > elapsed / days`; otherwise `ok`. When `forSpending <= 0`, any spending counts as fully spent (share 1), so status is `warn`, or `over` if `available < 0`; no spending gives `ok`. Each limit shows its own progress the same way.
- Savings: if `savings_percent` is set, savings = `floor(income * percent_x100 / 1_000_000) * 100` (whole units), computed at read time and never relied on from storage; saves also write that computed amount to `savings` for rollout compatibility (older releases read only `savings`). If null, savings is the `savings` amount.
- Rule status: `paid` if a linked movement exists in the month; otherwise `overdue` for any past month, or by due day (clamped to the month's length) within the current/future month: `overdue` / `today` / `upcoming`.

### Account balance (always computed, never stored; `src/lib/server/accounts/balance.ts`)

```
balance = initial_balance
        + sum(incomes.amount)
        - sum(outcomes.amount)
        - sum(transfers_out.amount)          -- this account as origin
        + sum(transfers_in.destination_amount) -- this account as destination
```

### Category net (per currency, per period; `toCurrencyNets` in `src/lib/server/categories/queries.ts`, home top 3 in `src/lib/server/dashboard/home.ts`)

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
- `canAccessOwn(userId, table)` and `userOwned(userId)`: the same pair for every other table with a `user_id` owner column: `categories`, `recurring_movements`, `spending_plans`, `mp_import_items`, `mp_import_rules`, `mp_connections`, `gmail_connections`, `galicia_connections`, `import_settings`, `card_alerts`, `card_statements`, `import_cards`. `table` may be an alias. Category limits have no owner column; they are reached only by joining their plan. `mp_sync_state` has no owner column; it is reached only by joining its account.
- `allMovementsOf(userId)`: `movements.user_id = userId`, the single path for bulk operations over every movement a user owns (account deletion).

Shared server infrastructure each has one home: SQL fragments (`Range`, `inRange`, `sumOfType`, `total`, `isIncomeOrOutcome`, the `dest` alias, `localMonth`, `exists`) in `src/lib/server/db/sql.ts`; the `Tx`/`DbExecutor` types in `src/lib/server/db/index.ts`; the per-request memo (`memoPerRequest`, the only `getRequestEvent` reader) in `src/lib/server/request-memo.ts`; `requireUser` and the 404 helpers in `src/lib/server/guards.ts`; archive, unarchive and delete-unless-referenced actions (plus `catchForeignKey`) in `src/lib/server/lifecycle.ts`; the stored icon/colour → key mapping (`accountLook`, `categoryLook`) in `src/lib/appearance.ts`.

Accounts, categories, the dashboard, movements, recurring rules and the plan each have a folder under `src/lib/server/`: `queries.ts` holds DB I/O only, `form.ts` the form fields, parsing and messages, and pure maths or compositions are named by what they compute (`accounts/balance.ts`, `dashboard/home.ts`, `movements/filters.ts`, `plan/summary.ts`, `plan/month-plan.ts`). Recurring auto-link (description matching, the rule amount following its latest payment, the rule locks, the revert on unlink) lives in `src/lib/server/recurring/link.ts`. Imports point one way: `plan` may import `recurring` and `movements`; `movements` may import `recurring/link`; neither `recurring` nor `movements` imports `plan`.

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
20. Recurring-rule amounts are in the account's currency and limit amounts in the limit's currency; only the plan figures convert them, at the plan rate. ARS values are whole pesos, validated in the actions.
21. Plan figures (see above; the plan is the only place where currencies are converted) (income, for spending, available, per day, status, limit progress) are computed at read time, never persisted. The plan setup wizard writes step by step (savings creates the plan, each limit and rule is saved on its own screen, the last step sets the plan month); nothing is staged across steps. Creating a movement with "Repetir cada mes" writes the rule and the movement (linked by `recurring_id`) in one transaction.
22. Deletion: hard-deleting an unreferenced account or category cascades to its recurring rules and plan limits. Deleting a recurring rule sets the linked movements' `recurring_id` to NULL, so history is kept. Archiving does not touch plan rows; rules on an archived account or category are inactive (excluded from plan sums, never linked to new movements).
