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

- Email + password only. Public sign-up; email verification is required before sign-in.
- Single user at launch; family/friends may be added later (small scale).
- Phone OTP: future, not MVP.
- Password reset: by emailed link (sent through Resend).
- Every user's data is isolated from every other user's.
- Shared accounts between users: **future**. The data model must leave this door open (see DATA_MODEL.md).

## Locale & formatting

- Currency display: `$ 1.234.568` (ARS), `US$ 1.234,56` (USD).
- Amount input: comma as decimal separator (USD only).
- ARS amounts and exchange rates are whole pesos; USD amounts have up to 2 decimals.
- Timezone for "month" boundaries and default dates: `America/Argentina/Buenos_Aires`.

## Layout

- Top bar (sticky, every app screen): optional back link, today's date as an eyebrow above the screen title, a bell linking to Avisos (with the alert count as a badge) and an avatar (initials) linking to Profile. Bottom-nav tabs have no back; every other screen has an "up" back to its parent (new-movement returns to the screen it was opened from). Screens have no action buttons under the bar; Accounts and Categories end their list with a "+ Nueva …" row. No currency control: each screen states its own currency, and amounts are never converted or summed across currencies.
- Bottom nav: Inicio | Movimientos | Create movement (center "+") | Plan | Reportes.
- Profile page: "Cuentas" and "Categorías" links (both are reached from Profile and link back to it), theme toggle (light / dark / system) + logout.

## Design

- Tone: classic, serious-bank feel.
- Inspiration: [arqfinance.com/en-AR](https://www.arqfinance.com/en-AR) — particularly font and buttons.
- Observed from ARQ:
  - Fonts: Beausite Classic (text), Beausite Fit (display) — commercial (Fatype), cannot ship without a license.
  - Pill (fully rounded) buttons, light font weights.
  - Palette: deep green `#00301c`, off-white `#f4ece6`, taupe `#776d65`, lime accent `#f0ff9c`, burgundy `#3e0f00`, blue `#5db3e8`.
- Light and dark themes required.
- Theme: shadcn/ui preset (bJMUTPE2), adapted: warm cream neutrals (no pure white in light), emerald primary, stone near-black dark mode, hairline borders, small radii.
- Typeface: **Geist Mono** (@fontsource-variable/geist-mono) for everything, amounts included.
- List interaction pattern: tapping a list item opens a detail page with Edit and Delete actions — no inline row actions. Create and edit share the same form.

## Screens (MVP)

### Dashboard

- Currency tabs `ARS | USD` (radiogroup), stored in the `currency` cookie; default ARS. Currencies are never converted or summed together.
- For the selected currency:
  - Total balance: all accounts of that currency, **including archived**.
  - Month balance: incomes − outcomes (transfers excluded).
  - The dashboard always shows the current month; there is no month navigation.
  - Top 3 categories by net outcome, each with amount and %.
- Below the balance card, a "Disponible para gastar" card for the selected currency (hidden when there are no accounts in it), reading the same figures as the `/plan` summary:
  - With a plan for the current month: "Disponible para gastar · {mes}", the amount, the status as text ("Vas bien", "Atención", "Te pasaste"), "{monto} por día · quedan N días" and a "Ver plan" link to `/plan`.
  - No plan: "Todavía no tenés un plan en {pesos|dólares}.", "Con tus ingresos, pagos fijos y ahorro calculamos cuánto podés gastar por día." and a "Crear plan" link to `/plan/setup`.
  - A one-month plan of a past month is treated as no plan and adds "Tu plan de {mes} terminó.".
- Last 10 movements in the selected currency, with a "Ver todos" link to `/movements?currency=`.

### Reportes

- Route `/reports`, a bottom-nav tab (no back link), h1 "Reportes".
- Currency tabs `ARS | USD` as on the dashboard; one currency per screen, never converted or summed. No accounts in the currency (archived counted): "No tenés cuentas en {currency}." + "Crear cuenta".
- Month: `?month=YYYY-MM` with previous / next navigation; a future or invalid month falls back to the current one; "Mes siguiente" is disabled on the current month.
- For the selected currency and month (archived accounts included, transfers excluded):
  - Totals: Ingresos, Gastos and Resultado (income − outcome, with an explicit sign; equals the dashboard month balance for the current month).
  - Income and outcome bars for the 6 months ending at the selected month; each pair links to its month.
  - Gastos por categoría: top 4 categories by net outcome plus "Otros", as a donut and a list (name, %, amount). With no categorised spending: "No hay gastos con categoría en {mes}."
  - Promedio diario: outcome ÷ elapsed days (the whole month for past months).
  - Gasto más grande, linking to the movement; hidden when there are no outcomes.

### Plan

- Route `/plan`, a bottom-nav tab (no back link), h1 "Plan". Currency tabs `ARS | USD`; one currency per screen, never converted or summed. No accounts in the currency: "No tenés cuentas en {pesos|dólares}." + a link to create one.
- Recurring incomes and payments ("Ingresos fijos", "Pagos fijos"): monthly rules with description, amount (in the account's currency; ARS in whole pesos), due day 1–31 (clamped to the month's last day), account and category.
- Each row shows description, amount, "Día N", account and a status as text: Cobrado/Pagado, Vence hoy, Mañana, En N días, Venció ayer, Venció hace N días. A rule is paid when a movement linked to it exists in the current month.
- An unpaid active rule has "Registrar", which opens `/movements/new?recurring=<id>` ("Registrar pago"): the form is prefilled from the rule with today's date, the category is the rule's and cannot be changed, the type and the account's currency must match the rule, and saving links the movement to the rule and returns to `/plan` with "Pago registrado.".
- A rule is inactive if the rule, its account or its category is archived; inactive rules are listed under "Inactivos" with the reason ("Archivado", "Cuenta archivada", "Categoría archivada") and cannot be registered.
- Create / edit at `/plan/recurring/new` and `/plan/recurring/[id]` (back to `/plan`); a rule can be archived or reactivated, or deleted with confirmation (the movements already registered are kept). Another user's or a missing rule is "Movimiento fijo no encontrado." (404).
- Empty state: "No tenés pagos ni ingresos fijos en {pesos|dólares}." with "Agregar pago fijo" and "Agregar ingreso fijo".
- Plan summary (top of `/plan`, per currency): "Disponible · {mes}" with the hero amount, a status as text ("Vas bien", "Atención", "Te pasaste"), "{monto} por día · quedan N días", and the figures Ingresos, Pagos fijos, Ahorro, Para gastar, Gastado and Disponible (Disponible = Ingresos (active income rules + otros ingresos) − Pagos fijos − Ahorro − Gastado). Gastado counts the month's outcomes on accounts in that currency (archived accounts included, transfers excluded) except those linked to an active rule, whose full amount is already in Pagos fijos. "Editar plan" opens the wizard.
- Limits: "Límites por categoría" lists each limit as "{gastado} de {límite}" with a progress meter and, as text, "Vas rápido" or "Te pasaste".
- No plan for the current month: "Todavía no tenés un plan en {pesos|dólares}." with "Crear plan" (and "Tu plan de {mes} terminó." after a one-month plan ends).
- Wizard `/plan/setup` (back "Volver al plan"; "Crear plan" / "Editar plan"), 4 steps: "¿Cuánto cobrás por mes en {ARS|USD}?" (keep or add income rules, accept detected ones, "Otros ingresos del mes (opcional)"), "¿Qué pagos fijos tenés?", "¿Cuánto querés ahorrar?" (Nada, 10 %, 20 % or Monto) and "Tu plan para {mes}" (the equation, the checkbox "Usar este plan todos los meses", "Límites por categoría (opcional)" with "Usar sugeridos"). Checked stores the plan for every month; unchecked only for the current month. Without JS all steps show at once with one "Guardar plan". Saving writes the plan, its limits and any rules created or archived in one transaction and returns to `/plan` with "Plan guardado."; "Eliminar plan" (with confirmation) deletes the plan and its limits but keeps the rules. ARS amounts are whole pesos.

### Avisos

- Route `/notifications` (back to Inicio), h1 "Avisos", reached from the bell in the top bar. Alerts are worked out from existing data when a page loads; nothing is stored, so there is no read state. The bell's badge is the number of alerts across both currencies (capped at "9+"; label "Avisos: N"); it refreshes on full page loads and after form submissions, not on client-side navigation.
- One group per currency that has accounts ("Pesos", "Dólares"); amounts are never converted or summed across currencies. Overdue payments first, then by due day, then plan and limits.
  - Fixed payment: an active payment rule (not income) that is unpaid this month and overdue or due within 3 days. Title is the description; the line below reads "{Vence hoy | Mañana | En N días | Venció …} · {monto} · {cuenta}". Opens `/movements/new?recurring=<id>`.
  - "Te pasaste del plan en {pesos|dólares}" or "Estás gastando más rápido de lo planeado en {pesos|dólares}" ("Gastado X de Y"; when savings plus fixed payments exceed income: "Tu ahorro y tus pagos fijos superan tus ingresos por X"), and "{categoría} superó su límite" ("X de Y"). They open `/plan` in that currency (a form that sets the currency cookie, so it works without JS). Limits that are only "Vas rápido" do not alert.
- Nothing to show: "Estás al día. No hay pagos por vencer ni excesos en tu plan."

### Accounts

- Reached from Profile (back link "Volver al perfil").
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
- "Repetir cada mes" (new movements only; hidden when editing and when registering a rule's payment): a checkbox with the hint "Te lo recordamos el mismo día de cada mes. Solo ingresos y gastos.". Checked, saving also creates a recurring rule (same description, amount, type, account and category) due on the movement's day of the month, and the movement is linked to it, so it counts as paid this month. Transfers never create a rule (the checkbox is hidden for them; without JS it shows and is ignored). Nothing is saved if the movement is rejected.

### Movements

- List with search (description) + filters: date range, type, account, category. Currency filter `?currency=ARS|USD` (default Ambas = merged list, each amount in its own currency); when an `?account=` filter is set, that account's own currency wins. Grouped by day.
- Tap → detail page with Edit / Delete.

### Categories

- List with search + filter: show archived.
- Tap → detail page with Edit / Delete.

## Rules

- ARS and USD are completely separate ledgers. The only link between them is a transfer between accounts of different currencies.
- Exchange rate is always expressed as "1 USD = X ARS", entered manually per transfer, in whole pesos. No automatic rates.
  - USD → ARS: `destination = amount × rate`.
  - ARS → USD: `destination = amount ÷ rate`.
  - Rounding: half-up to whole pesos into ARS, half-up to cents into USD.
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

- Credit cards / installments (cuotas).
- Attachments / receipts.
- CSV import/export.
- Shared accounts.
- Phone OTP.
- Push or email notifications (Avisos are in-app only).
- Automatic exchange rates.
- Adjustable (editable) destination amount on cross-currency transfers.
