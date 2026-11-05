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
- Password reset: by emailed link (sent through Resend). Links last 24 hours (verification) and 1 hour (reset).
- Screens: Ingresar / Crear cuenta are the entry (tabs, no back link); every other signed-out screen has "Volver" at the top. A wrong password keeps the typed email, clears the password and focuses it. After sign-up, "Revisá tu email" names the address and offers a rate-limited "Reenviar" (60 s countdown). The password-reset confirmation is neutral and never says whether the address has an account. An expired verification link (`/verify-email`) shows the address pre-filled when this browser remembers the one it was sent to (local storage, per browser), so asking for a new link is one tap; an expired reset link offers "Pedir otro" first.
- Every user's data is isolated from every other user's.
- Shared accounts between users: **future**. The data model must leave this door open (see data-model.md).

## Locale & formatting

- Currency display: `$1.234.568` (ARS), `US$1.234,56` (USD); no space after the symbol, ARS never shows decimals.
- Amount colors: green = positive, red = negative, blue = transfer, never a minus sign. Group totals are neutral (red when negative); savings and informational figures (per day, limits) are neutral.
- Amount input: comma as decimal separator (USD only).
- Manual ARS amounts, initial balances and exchange rates are whole pesos; USD amounts have up to 2 decimals. Amounts imported from Mercado Pago keep their cents, and editing may keep a movement's existing non-whole amount; non-whole ARS values display rounded half-up.
- Dates: `dd/mm/aaaa` (e.g. `29/02/2024`); date inputs are a custom calendar (week starts Monday, Spanish), never the native date input.
- Timezone for "month" boundaries and default dates: `America/Argentina/Buenos_Aires`.

## Layout

- Top bar (sticky, every app screen): optional back link, today's date as an eyebrow above the screen title, a bell linking to Avisos (with the alert count as a badge) and an avatar (initials) linking to Profile. Bottom-nav tabs have no back; every other screen has an "up" back to its parent (new-movement returns to the screen it was opened from). Going up pops history like a native stack: back ‹, close ✕, Cancelar and a save that returns to the parent go back to it when it is the screen the user came from (so the edge swipe-back matches), otherwise they replace the current entry with the parent; after a reload the history is unknown and they always replace. Tabs, month arrows, the currency switch and list filters replace the current entry instead of adding one. Without JavaScript they are plain links to the parent. Screens have no action buttons under the bar; Accounts and Categories end their list with a "+ Nueva …" row. No currency control: each screen states its own currency, and amounts are never converted or summed across currencies.
- Bottom nav: Inicio | Movimientos | Create movement (center "+") | Plan | Reportes.
- Profile page (back to Inicio): the user's initial, name and email, then four groups:
  - What the user manages: "Cuentas" and "Categorías" (with the number of active ones) and, when Mercado Pago is on, "Mercado Pago" (value "Vincular", "Vinculado" or "Reconectar"; it leads to `/profile/mercado-pago`, the inbox is reached only from the Home Mercado Pago pill).
  - Identity: "Nombre", edited in place (Enter or blur saves, with a Deshacer toast; an empty or too long name is not saved and keeps the old one), and "Contraseña", a "Cambiar contraseña" drawer over Profile (current + new password, min 8; revokes all other sessions, this one stays signed in). `/profile/password` is the same form as a page.
  - "Tema" (light / dark / system) as its own card.
  - "Cerrar sesión", and a quiet red "Darme de baja" link at the end: the "¿Darte de baja?" drawer lists what is erased with real counts (accounts and movements, categories, plan and fixed payments; only what applies), asks for the password and warns it cannot be undone; see Deletion. `/profile/delete` is the same as a page. Financial accounts keep "Eliminar cuenta".

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

- Currency tabs `ARS | USD` (two toggle pills, "Pesos" / "Dólares"), stored in the `currency` cookie; default ARS. Currencies are never converted or summed together.
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
- Currency tabs `ARS | USD` as on the dashboard; one currency per screen, never converted or summed. No accounts in the currency (archived counted): "No tenés cuentas en {pesos|dólares}." + "Crear cuenta" (no month navigation). Accounts but no movements in the currency in the last 6 months: only "Sin movimientos en {pesos|dólares}.".
- Month: `?month=YYYY-MM` with previous / next navigation; a future or invalid month falls back to the current one; "Mes siguiente" is disabled on the current month.
- For the selected currency and month (archived accounts included, transfers excluded):
  - Totals: Ingresos, Gastos and Resultado (income − outcome, shown without a sign and coloured by polarity: green positive, red negative, neutral zero; equals the dashboard month balance for the current month). Ingresos and Gastos sit side by side.
  - Income and outcome bars for the 6 months ending at the selected month, with a legend; the selected month is highlighted. Each pair links to its month: months change with ‹ › or a tap on a bar (no swipe).
  - Gastos por categoría: top 4 categories by net outcome plus "Otros" (last, not a link), as horizontal bars: name, %, amount and a bar (no donut). With no categorised spending: "No hay gastos con categoría en {mes}." and "Por día" is hidden.
  - Por día: outcome ÷ elapsed days (the whole month for past months).
  - Gasto más grande, linking to the movement; hidden when there are no outcomes. Por día and Gasto más grande share a row.

### Plan

- Route `/plan`, a bottom-nav tab (no back link), h1 "Plan". Currency tabs `ARS | USD`; one currency per screen, never converted or summed. No accounts in the currency: "No tenés cuentas en {pesos|dólares}." + a link to create one.
- Recurring incomes and payments ("Ingresos fijos", "Pagos fijos"): monthly rules with description, amount (in the account's currency; ARS in whole pesos), due day 1–31 (clamped to the month's last day), account and category.
- Each row shows description, amount, "Día N", account and a status as text: Cobrado/Pagado, Vence hoy, Mañana, En N días, Venció ayer, Venció hace N días. An unregistered income past its day reads "Esperado el día N" with a neutral tone (never red, never in Avisos). A rule is paid when a movement linked to it exists in the current month.
- An unpaid active rule has "Registrar", which opens `/movements/new?recurring=<id>` ("Registrar pago", or "Registrar ingreso" for an income rule, which hides the type selector and takes the rule's type server-side): the form is prefilled from the rule with today's date, the category is the rule's and cannot be changed, the type and the account's currency must match the rule, and saving links the movement to the rule and returns to `/plan` with "Pago registrado.".
- A rule is inactive if the rule, its account or its category is archived; inactive rules are listed under "Inactivos" with the reason ("Archivado", "Cuenta archivada", "Categoría archivada") and cannot be registered.
- A rule's detail `/plan/recurring/[id]` is also its editor (no `/edit` route; the old URL is a 404): amount, description, Cuenta, Categoría and Día del mes (1–31 picker) save on their own with a Deshacer toast; actions are "Registrar pago/ingreso", "Desactivar" / "Activar" and "Eliminar" (confirmation, not undoable; the movements already registered are kept). When it cannot be registered the reason is shown and Categoría stays editable. New rules open as a drawer over `/plan` (Cancelar / Guardar; Guardar waits for amount and description). Another user's or a missing rule is "Movimiento fijo no encontrado." (404).
- Empty state: "No tenés pagos ni ingresos fijos en {pesos|dólares}." with "Agregar pago fijo" and "Agregar ingreso fijo".
- Plan summary (top of `/plan`, per currency): "Disponible · {mes}" with the hero amount, a status as text ("Vas bien", "Atención", "Te pasaste"), "{monto} por día · quedan N días", and the figures Ingresos, Pagos fijos, Ahorro, Para gastar, Gastado and Disponible (Disponible = Ingresos (active income rules) − Pagos fijos − Ahorro − Gastado). Gastado counts the month's outcomes on accounts in that currency (archived accounts included, transfers excluded) except those linked to an active rule, whose full amount is already in Pagos fijos.
- Limits: "Límites por categoría" lists each limit as "{gastado} de {límite}" with a progress meter and, as text, "Vas rápido" or "Te pasaste". Each limit opens a drawer over `/plan` (`/plan/limits/[categoryId]`: tap the amount to edit, autosave with Deshacer, "Usar promedio", "Eliminar límite" with confirmation) and "Agregar" opens the new-limit drawer (`/plan/limits/new`; its category list hides categories that already have a limit). The Ahorro figure opens a drawer (`/plan/savings`): list rows with a checkmark, a pick saves on its own with Deshacer, "Otro" takes a % or amount. Deshacer never closes these drawers. "Eliminar plan" (with confirmation) on `/plan` deletes the plan and its limits but keeps the rules.
- No plan for the current month: "Todavía no tenés un plan en {pesos|dólares}." with "Crear plan" (and "Tu plan de {mes} terminó." after a one-month plan ends).
- First-setup wizard `/plan/setup?step=N` ("Crear plan"), 5 steps with a 5-segment progress bar: Ingresos (the /plan income rows, "Inactivos" greyed, "+ Agregar" opens the new-rule drawer without leaving the step), Pagos fijos (same for payments), Ahorro (Nada, 10 %, 20 % or Otro, as `/plan/savings`; "Siguiente" creates the plan), Límites ("+ Agregar" opens the new-limit drawer; "Usar sugeridos" sets the average of the last 3 months for every expense category without a limit) and Resumen (Ingresos, Pagos fijos, Ahorro, Para gastar, the switch "Usar este plan todos los meses" and "Guardar plan"). Adding happens in drawers over the step; there are no inline forms. The bar has Cancelar (step 1) or Atrás on the left (1/3) and Siguiente or Guardar plan on the right (2/3). Without a step and with a current plan it redirects to `/plan`; steps 4-5 without a plan go back to step 3. Checked stores the plan for every month; unchecked only for the current month. Saving returns to `/plan` with "Plan guardado.". ARS amounts are whole pesos.

### Avisos

- Route `/notifications` (back to Inicio), h1 "Avisos", reached from the bell in the top bar. Alerts are worked out from existing data when a page loads; nothing is stored, so there is no read state. The bell's badge is the number of alerts across both currencies (capped at "9+"; label "Avisos: N"); it refreshes on full page loads and after form submissions, not on client-side navigation.
- One group per currency that has accounts ("Pesos", "Dólares"); amounts are never converted or summed across currencies. Overdue payments first, then by due day, then plan and limits.
  - Fixed payment: an active payment rule (not income) that is unpaid this month and overdue or due within 3 days. Title is the description; the line below reads "{Vence hoy | Mañana | En N días | Venció …} · {monto} · {cuenta}". Opens `/movements/new?recurring=<id>`.
  - "Te pasaste del plan en {pesos|dólares}" or "Estás gastando más rápido de lo planeado en {pesos|dólares}" ("Gastado X de Y"; when savings plus fixed payments exceed income: "Tu ahorro y tus pagos fijos superan tus ingresos por X"), and "{categoría} superó su límite" ("X de Y"). They open `/plan` in that currency (a form that sets the currency cookie, so it works without JS). Limits that are only "Vas rápido" do not alert.
- Nothing to show: "Estás al día. No hay pagos por vencer ni excesos en tu plan."

### Accounts

- Reached from Profile (back link "Volver al perfil").
- List with a search field and a "Filtros" button (bottom drawer, applies on change; the button shows the number of non-default filters). Filters: currency `?currency=ARS|USD` (default both) and "Mostrar archivadas" (archived hidden by default). Accounts are grouped under Pesos / Dólares, each with the total of its active (non-archived) accounts.
- Each row: icon, color, name ("Archivada" when archived), computed balance.
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

- List with a search field (description) and a "Filtros" button (bottom drawer, applies on change; badge = number of non-default filters). Filters: currency, type, account, category and one date range (`from`/`to`, a single range calendar). Currency `?currency=ARS|USD` (default Ambas = merged list, each amount in its own currency; non-default counts as active); when an `?account=` filter is set, that account's own currency wins and is not counted. Grouped by day.
- Tap → detail page with Edit / Delete.

### Categories

- List with a search field and a "Filtros" button (bottom drawer): "Mostrar archivadas" and kind `Todas | Gastos | Ingresos` (`?kind=outcome|income`; Gastos / Ingresos also list categories with no kind). The button badge counts both.
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
  - User account: hard delete, immediate and irreversible, of the user and all their data (movements, recurring rules, plans and limits, categories, accounts, sessions) in one transaction; then sign-out to the login page.

## Mercado Pago import

- Optional, per user: on only when the server has `MP_CLIENT_ID`, `MP_CLIENT_SECRET` and `MP_TOKEN_KEY` (off: the Profile row is hidden and the Mercado Pago routes answer 404). Each signed-in user links their own Mercado Pago account through OAuth (PKCE) and gets the full import for themselves; nobody sees another user's import.
- Profile → "Mercado Pago" leads to `/profile/mercado-pago`, (back to Perfil), which has three states: not linked, one card saying what gets imported and a single "Vincular Mercado Pago"; linked, settings only (no link to the inbox, which is reached from the Home pill): "Entra en" (a list row that opens the active ARS accounts and saves on pick, with Deshacer; the first pick has no Deshacer), "Importar desde" (see below) and "Desvincular"; and "Reconectar" when Mercado Pago no longer accepts the saved access (revoked, or the token could not be renewed). The Profile row shows "Vinculado" when linked, else "Vincular" or "Reconectar". Without a usable connection `/imports` redirects to `/profile/mercado-pago`; while a reconnect is pending it still lists the items, hides "Sincronizar" and offers "Reconectar". The inbox (back to Inicio) has no settings links.
- Disconnecting deletes only the stored connection: imported items, rules and sync state stay. The user can also revoke access from their Mercado Pago account. Changing the receiving account starts the sync over for the new account; items are never duplicated.
- "Importar desde" (on the linked, account-set `/profile/mercado-pago`): the minimum date of every sync, picked on the calendar and saved on its own with Deshacer; at most 12 months back and not in the future. Moving it earlier pulls payments and the settlement report from that day to now; moving it later drops the pending items before it. It is disabled while a sync runs. It can be used at any time, leaves the regular sync window (`synced_until`) untouched, and never duplicates or changes items already imported, approved or rejected.
- Tokens are stored encrypted, renewed automatically before they expire, and never shown to the client.
- Sources, pulled on "Sincronizar ahora" and every `MP_SYNC_INTERVAL_HOURS` (default 6):
  - Payments (`/v1/payments/search`, both directions, from the latest imported payment minus three days; incoming amounts are net of MP fees): shown at once. Only approved payments become items; credit-card payments never touch the balance and are skipped. A refund or chargeback becomes a separate "Devolución" item in the opposite direction when the payment is still approved (partial refund) or was already imported and not rejected.
  - The Mercado Pago settlement report, requested in the background (it waits minutes in MP's queue): only daily yields and payouts. A payout with an external reference is titled "Pago en comercio" (pre-filled Gasto); without one, "Transferencia o retiro" (pre-filled Transf.). Gastar turns off MP's "report ready" emails by emptying the report config's email list on each linked account.
- Items keep the real time of day (Buenos Aires).
- Each payment, yield or payout becomes a pending item in a separate inbox, grouped by day, with the pending count shown in the Home pill. Nothing touches balances or movements until an item is approved. The inbox (`/imports`, opened from the Home pill) starts with one line: the last sync ("Hace 2 h") and "Sincronizar"; while a run is in progress that line becomes "Sincronizando…" / "Puede tardar unos minutos." (no count, no "Sincronizar") and a run seen on the page ends with "Listo. N movimientos nuevos.". "Aprobar N sugeridos" is a full-width button of its own (with a confirm). Tapping a row opens its review as a drawer over the inbox (shallow route); `/imports/[id]` is the same review as a page for direct URLs (404 unless it is the user's and still pending). A suggested row ("{category o cuenta} · sugerido") has a quick "Aprobar"; an unknown one ("No sabemos qué es") a "Revisar" shortcut.
- Deshacer of a quick "Aprobar" (`/imports?/undoApprove`) runs in one transaction: it deletes the movement the approval created and returns the item to pending. It refuses (nothing changes, "No se pudo deshacer." toast) when the movement was edited or deleted meanwhile, or the item is no longer an approved one. It never touches rules: a quick approval remembers nothing.
- Yields are one item per day, with the exact net amount.
- Review: a one-line summary (amount, date and time, the original description below, ellipsized) is read-only and, for an item no rule suggests, "No sabemos qué es: elegí el tipo."; the user edits type (a credit offers Ingreso / Transf., a debit Gasto / Transf.), description, category (income/outcome) or counter account (transfer: same-currency ARS, not the Mercado Pago account). A debit transfer goes from Mercado Pago to the counter account; a credit transfer comes from it. The description is required (prefilled from the original; "Aprobar" is disabled while empty). "Aprobar" creates the movement and returns to the inbox (no auto-advance); "Descartar" asks "¿Descartar movimiento?" and rejects the item for good (the sync never re-imports it). Both confirm with a toast.
- Learning: approving remembers the choice (type, category or counter account, description as alias) under the strongest key of the item: counterparty (transfers), then merchant, then kind (yields, each payout label, account funds); refunds teach nothing. The next matching pending item is pre-filled and shows "… · sugerido" in the list. Only the first matching rule is used, and only while its category or account is still active; otherwise the item gets defaults (payments by direction; yields income; "Pago en comercio" outcome; other payouts and account funds transfer; anything else asks to review the type). Categories are never created automatically.

## Out of MVP

- Credit cards / installments (cuotas).
- Attachments / receipts.
- CSV import/export (the Mercado Pago import is the exception: see "Mercado Pago import").
- Shared accounts.
- Phone OTP.
- Push or email notifications (Avisos are in-app only).
- Automatic exchange rates.
- Adjustable (editable) destination amount on cross-currency transfers.
