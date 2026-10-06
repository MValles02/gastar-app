# gastar-app — Product

## Goal

Personal finance PWA for Argentina. Answers two questions:

- How much money do I have?
- How is my month going?

## Language policy

- UI text: Spanish.
- Everything else (code, routes, DB schema, identifiers, docs): English.

## Stack

| Concern | Choice |
|---|---|
| Framework | SvelteKit |
| ORM | Drizzle ORM |
| Database | Postgres |
| Hosting | User's VPS, via Dokploy |
| PWA | `@vite-pwa/sveltekit` |
| Auth | Better Auth |

## Auth

- Email + password only. No public signup — invite-only.
- Single user at launch; family/friends may be added later (small scale).
- Phone OTP: future, not MVP.
- Password reset: manual admin action (no email provider configured yet).
- Every user's data is isolated from every other user's.
- Shared accounts between users: **future**. The data model must leave this door open (see DATA_MODEL.md).

## Locale & formatting

- Currency display: `$ 1.234.567,89` (ARS), `US$ 1.234,56` (USD).
- Amount input: comma as decimal separator.
- Max 2 decimals everywhere — amounts and exchange rates.
- Timezone for "month" boundaries and default dates: `America/Argentina/Buenos_Aires`.

## Layout

- Top bar (sticky, every app screen): optional back link, today's date as an eyebrow above the screen title, and an avatar (initials) linking to Profile. Bottom-nav tabs have no back; every other screen has an "up" back to its parent (new-movement returns to the screen it was opened from). Screens have no action buttons under the bar; Accounts and Categories end their list with a "+ Nueva …" row. No currency control: each screen states its own currency, and amounts are never converted or summed across currencies.
- Bottom nav (MVP): Dashboard | Accounts | Create movement (center "+") | Movements | Categories.
- Future nav change: "Reports" replaces Categories in the bottom nav; Categories moves into the Profile menu. Reports are **not** in MVP.
- Profile page (MVP): theme toggle (light / dark / system) + logout.

## Design

- Tone: classic, serious-bank feel.
- Inspiration: [arqfinance.com/en-AR](https://www.arqfinance.com/en-AR) — particularly font and buttons.
- Observed from ARQ:
  - Fonts: Beausite Classic (text), Beausite Fit (display) — commercial (Fatype), cannot ship without a license.
  - Pill (fully rounded) buttons, light font weights.
  - Palette: deep green `#00301c`, off-white `#f4ece6`, taupe `#776d65`, lime accent `#f0ff9c`, burgundy `#3e0f00`, blue `#5db3e8`.
- Light and dark themes required.
- Theme: **Pampa** (forest green + lime on warm stone), light and dark, with the shadcn/ui visual language (stone neutrals, hairline borders, small radii).
- Typeface: **DM Sans** (@fontsource/dm-sans, weights 400/500/600).
- List interaction pattern: tapping a list item opens a detail page with Edit and Delete actions — no inline row actions. Create and edit share the same form.

## Screens (MVP)

### Dashboard

- Currency tabs `ARS | USD` (radiogroup), stored in the `currency` cookie; default ARS. A legacy `both` value reads as ARS. Currencies are never converted or summed together.
- For the selected currency:
  - Total balance: all accounts of that currency, **including archived**.
  - Month balance: incomes − outcomes (transfers excluded).
  - The dashboard always shows the current month; there is no month navigation.
  - Top 3 categories by net outcome, each with amount and %.
- Last 10 movements in the selected currency, with a "Ver todos" link to `/movements?currency=`.

### Accounts

- List with search + filter on top: show archived (archived hidden by default). Currency filter `?currency=ARS|USD` (default both); accounts are grouped under Pesos / Dólares, each with the total of its active (non-archived) accounts.
- Each row: icon, color, name, currency, computed balance.
- Tap → detail page with Edit / Delete.

### Create movement

- Type toggle: Income / Outcome / Transfer.
- Fields:
  - Date (default: today).
  - Description (short).
  - Amount.
  - Account: origin (all types), destination (transfer only).
  - Exchange rate: shown only for a transfer between accounts of different currencies.
  - Category: required for income/outcome, not shown for transfers.
- Cross-currency transfer: destination amount is computed live and shown, but is **not editable**.

### Movements

- List with search (description) + filters: date range, type, account, category. Currency filter `?currency=ARS|USD` (default Ambas = merged list, each amount in its own currency); when an `?account=` filter is set, that account's own currency wins. Grouped by day.
- Tap → detail page with Edit / Delete.

### Categories

- List with search + filter: show archived.
- Tap → detail page with Edit / Delete.

## Rules

- ARS and USD are completely separate ledgers. The only link between them is a transfer between accounts of different currencies.
- Exchange rate is always expressed as "1 USD = X ARS", entered manually per transfer, max 2 decimals. No automatic rates.
  - USD → ARS: `destination = amount × rate`.
  - ARS → USD: `destination = amount ÷ rate`.
  - Rounding: half-up to 2 decimals.
  - Example: 100 USD at rate 1500 → 150.000 ARS. 150.000 ARS at rate 1500 → 100 USD.
  - Same-currency transfer: no rate; destination amount = amount.
- Transfers never count toward month balance and have no category.
- Balances are always computed, never stored:
  `balance = initial_balance + incomes − outcomes − transfers_out(amount) + transfers_in(destination_amount)`.
- Categories have no type — both incomes and outcomes can use any category.
  - Category net (per currency, per period) = outcomes − incomes. Example: a 100 dinner outcome + a 50 reimbursement income in the same category = net spend 50.
  - Top 3 = categories with the highest positive net outcome.
  - % = category net ÷ sum of all positive category nets.
  - Categories with net ≤ 0 are excluded from the top 3.
- Categories are shared across currencies; their stats are split by currency.
- Accounts have no types. Each has: name, currency, initial balance, icon, color.
  - Currency cannot change once the account has movements.
- Deletion:
  - An account or category referenced by any movement cannot be deleted — the UI offers Archive instead.
  - An unreferenced account/category is hard-deleted, with confirmation.
  - Archived items: cannot be selected for new movements; movements that already reference them keep showing them and can be edited without losing the reference; can be unarchived.
  - Archived accounts still count toward total balance.
  - Movements: hard delete, with confirmation.

## Out of MVP

- Reports (charts/analytics screen beyond the dashboard top-3).
- Budgets.
- Recurring movements.
- Credit cards / installments (cuotas).
- Attachments / receipts.
- CSV import/export.
- Charts beyond the dashboard top-3 categories.
- Shared accounts.
- Phone OTP.
- Automatic exchange rates.
- Adjustable (editable) destination amount on cross-currency transfers.
