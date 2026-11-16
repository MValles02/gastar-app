# Plan: Google sign-in and Gmail card alerts

Status: proposed (2026-11-16). Two independent features delivered as one plan: first "Continuar con Google", then "Vincular Gmail" to import card purchase alerts. Delete this file when the last phase ships; the lasting rules move to `docs/scope.md` and `docs/data-model.md` phase by phase.

## Decisions taken (user, 2026-11-16)

1. Sign-in and Gmail are separate features, separate Google Cloud projects, separate OAuth consents. The sign-in never asks for Gmail access.
2. Same email: a Google sign-in whose email equals an existing account's email joins that account automatically, only when Google reports the email as verified and the local account's email is already verified. A local account that never verified its email is not joined (prevents pre-registration takeover).
3. A user without a password confirms "Darte de baja" by signing in with Google again (recent session).
4. A user without a password gets "Crear contraseña" in Perfil.
5. No "Google" row in Perfil: no manual link or unlink. Google is linked only by signing in with the same email.
6. "Vincular Gmail" is available to every user (no allowlist).
7. Credit card: the alert creates the expense the same day; the statement confirms it. A statement line that matches an alert creates no second item. An amount difference becomes a separate small item "Diferencia con el resumen"; an approved movement is never modified.
8. Debit card purchases in dollars are debited from the dollar account as they are.
9. Cards are set up when they first appear in an alert: type (credit or debit) and accounts, once per card.
10. Mastercard waits for a sample email.

## Facts this plan relies on

Google:

- `openid email profile` are non-sensitive scopes: no security assessment, no user cap. Brand verification (name and logo on the consent screen) takes about 2-3 business days and needs domain ownership.
- `gmail.readonly` is a restricted scope. An unverified app in Production shows the "Google no verificó esta app" screen and has a 100-user cap that counts over the whole life of the project and cannot be reset. Exhausting the cap can disable Google sign-in for that project: this is why sign-in lives in another project.
- A project in Testing status issues refresh tokens that expire in 7 days; Production does not. Refresh tokens with Gmail scopes are revoked when the user changes their Google password, and after 6 months unused.
- Gmail API cost: `messages.list` 5 units, `messages.get` full 60 units; limit 6,000 units per user per minute. Polling every 15 minutes is far below it.
- Any use of Google user data needs a privacy policy that describes it and must follow the Limited Use policy, verified or not.

Better Auth 1.7.15 (read from `node_modules`):

- The built-in `socialProviders.google` hard-codes Google's endpoints, so an E2E test cannot reach a fake. The `genericOAuth` plugin takes a `discoveryUrl`, which an env var can point at a fake OIDC server.
- Implicit linking (`oauth2/link-account.mjs`) is refused unless the provider reports `email_verified` (or is a trusted provider) and, by default (`requireLocalEmailVerified: true`), the local user's email is verified. This is decision 2 with no extra code. Google must not be added to `trustedProviders`.
- `account.encryptOAuthTokens` encrypts stored provider tokens. `auth.api.setPassword` (server only) gives a password to a user who has none.
- The `account` table already has every column sign-in needs: no migration for phase 1.

The repo:

- `/profile/delete` requires `verifyPassword` and `/profile/password` requires the current password: both break for a user without a password.
- The Mercado Pago connection is the model for Gmail: PKCE OAuth, AES-256-GCM tokens with the user id as AAD (`imports/mercado-pago/oauth.ts`), `needs_reconnect`, env-overridable base URLs and a fake server for E2E (`e2e/fake-mp.js`), an hourly scheduler started from `hooks.server.ts`.
- `ingestImportItems` (`imports/ingest.ts`) is the only writer of import items and runs auto-approval after it.
- CSP (report-only) lists `form-action` targets in `vite.config.ts`.

Visa alert emails (3 real samples):

- Sender `DoNotReplyAlertadeComprasVisa@visa.com`, subject "Alerta de Compras Visa", one fixed HTML block: Comercio, País, Ciudad, Tarjeta (last 4), Referencia (True/False, meaning unknown), Tipo de transacción (only "Compra" seen), Moneda, Monto. Foreign purchases say "en el exterior". ARS amounts may carry "(puede haber una diferencia en el monto real)". No transaction id. Merchant text can be masked (`MERPAGO*MABERONxxxx`).
- Card 2186 is the Galicia credit card (it is the "TARJETA 2186" of the Visa statement). Card 0515 is the Galicia debit card: no statement, the alert is its only source.

## Unknowns to close (phase 0)

- U1. Whether the Mercado Pago sync imports payments made in Mercado Pago with a debit card as expenses of the Mercado Pago account (`payments.ts` skips only `credit_card`). If it does, a `MERPAGO*` debit alert would duplicate it.
- U2. What a Visa alert looks like for a purchase in installments (total or cuota, any marker), for a reversal or refund, and for an ATM withdrawal.
- U3. The Mastercard alert format (sender, fields).
- U4. Whether the alert of the 2186 MERPAGO purchase (ARS 11.375,10) matches the statement amount to the cent: first real data point for the ARS tolerance.
- U5. Whether an iOS home-screen PWA returns to the app after the Google redirect (the Mercado Pago OAuth flow already does this; confirm on a real phone).

## Phase 0: prerequisites (user) and spikes

User, in Google Cloud (Claude gives click-by-click steps when the phase starts; Claude never types secrets):

- Project `gastar-login`: OAuth consent External, Production, scopes `openid email profile`, authorized domain `gastar.app`, home page and privacy policy URLs, brand verification submitted. Two OAuth clients: production (`https://web.gastar.app/api/auth/oauth2/callback/google`) and development (`https://dev.gastar.app/...` and `http://localhost:5173/...`).
- Projects `gastar-gmail` and `gastar-gmail-dev` (phase 3): Gmail API enabled, scope `gmail.readonly`, Production, left unverified. Separate projects so dev test accounts never consume the production cap.
- Env vars set by the user in Dokploy (dev first) and in the local `.env`.

Spikes (read-only, no code shipped):

- U1: with the user's approval, count on the dev database the Mercado Pago items whose payment used a debit card, and compare one with its Visa alert.
- U2, U3: the user forwards or points to a sample of each when one exists.

Done when: `gastar-login` clients exist and their values are in dev; U1 has an answer.

## Phase 1: "Continuar con Google" (PR 1, to `develop`)

Scope:

- `auth.ts`: `genericOAuth` provider `google`, discovery URL from `GOOGLE_DISCOVERY_URL` (default Google's), scopes `openid email profile`, no offline access, `account.encryptOAuthTokens: true`. Off when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are unset: no button, like Mercado Pago. Rate-limit rules for the OAuth start and callback paths.
- `/login` and `/signup`: a "Continuar con Google" button above the form, as a server form action that answers 303 to Google (works without JavaScript). `form-action` in the CSP gains `https://accounts.google.com`.
- New user through Google: account created with the Google name (cut to `USER_NAME_MAX_LENGTH`), email already verified, no verification email. The Google picture is not used.
- Errors come back to `/login?error=<code>` with Spanish copy: local account not verified ("Ya hay una cuenta con ese email sin verificar. Entrá con tu contraseña y verificá el email."), cancelled at Google, anything else ("No pudimos entrar con Google. Probá de nuevo.").
- `src/env.ts`, `env-check.ts` (both Google vars or neither), `README.md`, `docs/scope.md`, `docs/deployment.md` (promotion check).
- E2E: `e2e/fake-google.js` (OIDC discovery, authorize, token, userinfo, JWKS) wired in `playwright.config.ts`.

Not in this phase: any Gmail scope, a Perfil row for Google, Google One Tap.

Acceptance (E2E, one test each):

- A new Google user lands on Inicio signed in, with no email sent.
- A verified email/password user signs in with Google on the same email and sees their existing data; the password still works.
- An unverified email/password account is not joined: the sign-in ends on `/login` with the message and no session.
- A Google profile with `email_verified: false` gets no session.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` exit 0.

Production keeps the Google env vars unset until phase 2 is merged, so no user without a password exists before they can leave or set one.

## Phase 2: accounts without a password (PR 2, stacked on PR 1)

Scope:

- One helper answers "has this user a password" (a `credential` row in `account`) and one answers "is this session recent" (session created at most 5 minutes ago).
- `/profile`: the row reads "Crear contraseña" when there is none. `/profile/password` then asks only for the new password, requires a recent session, and calls `auth.api.setPassword`. With a password it behaves as today.
- `/profile/delete`: with a password, as today. Without one, the form shows "Confirmar con Google": it starts a Google sign-in (`prompt=login`) that returns to `/profile/delete`; the delete action then requires a recent session. Signing in as a different Google account lands on that account's own page, never deletes the first one.
- `deleteUserAndData`: unchanged for phase 1 data (`account` rows cascade).
- `docs/scope.md`.

Acceptance (E2E):

- A Google-only user creates a password and then signs in with email and password.
- A Google-only user cannot delete the account with an old session, and can after "Confirmar con Google"; the data is gone.
- "Crear contraseña" with an old session is refused.
- Lint, typecheck, build exit 0.

After merge: set the Google env vars in production (user), promote, check on a real phone (U5).

## Phase 3: "Vincular Gmail" (PR 3)

Connection only: nothing is imported yet.

Scope:

- Table `gmail_connections` (user id PK, Google account id and email, encrypted access and refresh tokens, expiry, `needs_reconnect`, sync cursor, last run, last error code). Additive migration.
- `imports/gmail/oauth.ts`, modelled on Mercado Pago: PKCE, state cookie, callback under `/profile/gmail`, token encryption with the helper extracted from `mercado-pago/oauth.ts` and a new `GMAIL_TOKEN_KEY`, refresh, `invalid_grant` sets `needs_reconnect`. `GMAIL_AUTH_BASE_URL` and `GMAIL_API_BASE_URL` overrides for the E2E fake. `login_hint` is the account email when the user signed in with Google.
- Vinculaciones gains "Gmail": "Vincular" / "Vinculado" / "Reconectar", shown only when `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_TOKEN_KEY` are set. `/profile/gmail`: what is read ("solo los mails de alertas de compras de Visa"), what is stored (the purchase data, never the email), a note that Google will show "Google no verificó esta app" and how to continue, "Vincular Gmail", and when linked "Desvincular" (revokes the token at Google and deletes the row; imported items stay).
- A consent that comes back without `gmail.readonly` is rejected with a message.
- `deleteUserAndData` deletes the connection (and revokes the token, best effort).
- `gastar-app-landing`: the privacy page describes the Gmail data use and the Limited Use commitment (separate PR in that repo).
- Docs: `scope.md`, `data-model.md`, `README.md` env vars.

Acceptance (E2E with `e2e/fake-gmail.js`):

- Link, see "Vinculado", unlink.
- A revoked token turns the row into "Reconectar" and reconnecting clears it.
- User A never sees or uses user B's connection.
- Lint, typecheck, build exit 0.

## Phase 4: alert ingestion and debit cards (PR 4)

Scope:

- Table `card_alerts`: one row per alert email (user, Gmail message id unique per user, network, last 4, merchant, country, currency, amount in minor units, foreign flag, transaction type, received time, linked import item or null). Only parsed fields; the email body is never stored or logged.
- Table `import_cards`: user, network, last 4, type (`credit` / `debit`), pesos account, dollar account; unique per user, network and last 4.
- `imports/gmail/visa-alert.ts`: parser for the fixed block. An email is accepted only when the Gmail `Authentication-Results` header shows `dkim=pass` for `visa.com`; anything else is ignored. An email that does not parse is counted in the sync error code, never guessed.
- `imports/gmail/sync.ts`: `messages.list` with `from:` the Visa sender and `after:` the cursor, then `messages.get`; lease and cursor like the Mercado Pago sync. Starts at the moment of linking (no backfill in this phase). Scheduler every 15 minutes; "Sincronizar" in `/imports` also runs it.
- Unknown card: its alerts wait in `card_alerts` and `/imports` shows one row "Tarjeta Visa ••0515: elegí qué es" opening a small form (credit or debit, accounts). Saving turns the waiting alerts into items. `/profile/gmail` lists the cards to edit them.
- Debit card: each "Compra" alert becomes an item of a new source `visa_debit` (label "Visa Débito"), kind `card_purchase`, on the card's account of the alert currency (decision 8), key `alert:<message id>`, timed. Merchant rules, auto-approval and "Es el pago fijo" work as for any item. `cardMerchantName` also drops a trailing run of masking `x`.
- A transaction type other than "Compra" becomes a pending item that always asks for review and is never auto-approved (until U2 says more).
- Credit card alerts are stored in `card_alerts` and create nothing until phase 5.
- If U1 is confirmed: the Mercado Pago sync skips payments made with a debit card, as it does with a credit card. This changes existing import behavior and needs the user's explicit approval before it is built.
- Migration widens the source check (as 0009 did for kinds). Docs updated.

Acceptance (E2E with the fake Gmail serving synthetic alerts):

- A debit alert in ARS and one in USD become pending items on the right accounts with the right amounts; a second sync adds nothing.
- An alert of an unknown card creates no item until the card is set up, then appears.
- An email that fails the DKIM check creates nothing.
- A learned merchant rule auto-approves the next debit alert of that merchant.
- User A's sync never writes to user B.
- Lint, typecheck, build exit 0; CI E2E stays under 5 minutes.

## Phase 5: credit card alerts and statement matching (PR 5)

Scope:

- A credit card alert becomes an item with the statement's own source (`galicia_visa`), kind `card_purchase`, on the Galicia pesos or dollar account, key `alert:<message id>`. Setting a card as credit requires the Galicia accounts to be chosen. Alerts stored since linking are converted when this phase deploys.
- Column `alias_key` on import items (nullable, unique per user): the key of the other side of a match.
- Statement upload, per consumo line, before inserting:
  1. Candidates: the user's alert items of the same network and currency with no `alias_key`, dated from 3 days before to 1 day after the line.
  2. Exact amount: match. Several candidates: nearest date, then the most similar cleaned merchant name.
  3. No exact amount, ARS only: match when the amounts differ by at most 15% and the cleaned merchant names are compatible (one is a prefix of the other). USD always needs the exact amount.
  4. Installment line `01/N`: match when the alert amount equals the cuota, or the cuota times N within 1%.
  5. On a match the line creates no item; the alert item stores the line's key in `alias_key`, so a re-upload matches nothing new and duplicates nothing.
  6. Amount difference: a pending alert item takes the statement amount (and becomes the cuota for an installment). An approved or rejected one is not touched: an item "Diferencia con el resumen · <comercio>" of kind `card_adjustment` is created for the difference (debit or credit), key `diff:<line key>`, auto-approved to the category of the original when a rule allows.
  7. No match: the line is imported as today.
- The reverse order (statement first, alert later) uses the same rule from the alert side: the alert creates no item and its key is stored as the statement item's `alias_key`.
- Taxes, perceptions and payments come only from the statement, as today.
- "No apareció en el resumen": a credit alert item still unmatched after two uploaded statements of its network that close after its date is listed in `/imports` under that line, each with "Descartar" (undoes its movement with the existing undo rules) and "Dejar". Nothing is removed automatically.
- The reconciliation to the cent of the statement is unchanged: matching happens after it.
- Tolerances (15%, 1%, the date window) are constants reviewed against U2 and U4 before the phase starts.
- Docs updated; `review` of the scope text for "Banco Galicia statements".

Acceptance (E2E, synthetic alerts plus synthetic statement PDF):

- An approved USD alert and its statement line: one movement, no new pending item.
- An approved ARS alert whose statement amount differs by 5%: the movement is unchanged and one "Diferencia con el resumen" item exists for the difference; uploading the statement again adds nothing.
- An alert for a 6-cuota purchase approved at the total: after the statement the net of the movement and the difference item equals the first cuota.
- Two monthly alerts of the same merchant and amount each match their own statement line.
- A statement uploaded before its alert arrives: the alert creates no item.
- An alert unmatched after two statements is listed and "Descartar" removes its movement.
- Lint, typecheck, build exit 0.

## Phase 6: Mastercard alerts (PR 6, blocked on U3)

Parser and sender for Mastercard, source `mastercard_debit` if such a card exists, credit matching against `galicia_mastercard`. Same acceptance as phases 4 and 5 for one representative case each.

## Delivery

- One PR per phase, each in its own worktree session; phase N+1 starts when phase N's PR is open (stacked) and is retargeted to `develop` before its base merges.
- Every phase touches authentication, sensitive data or migrations: the verifier runs on Opus, the PR is left for the user to merge, nothing is auto-merged. Promotion to `main` is the user's call.
- Migrations are additive (new tables, nullable column, wider checks): safe with start-first deploys.
- Tests are E2E only, limited to money, data, auth and isolation; fakes for Google and Gmail run next to `fake-mp.js`.
- Real-phone checks before promoting: Google sign-in from the installed PWA on iOS and Android (U5), the "app no verificada" path when linking Gmail.

## Risks

- The 100-user cap of `gastar-gmail` is for life. With "Vincular Gmail" open to everyone, the row should disappear by env switch if the count nears the cap; the alternative is the paid security assessment.
- Google can ask an unverified Production app with a restricted scope to verify at any time; the feature then pauses for new users.
- Visa can change the email format: the parser fails closed (no item, error code in the sync state) instead of guessing.
- ARS tolerance too wide joins two different purchases; too narrow leaves duplicates. Both are visible and reversible (the difference item, "Descartar"), and the constants are reviewed with real data before phase 5.
- An attacker cannot inject expenses by email: only messages in the user's own mailbox that pass Visa's DKIM are read.
