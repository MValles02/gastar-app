# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gastar** is a personal finance tracker for Argentine users — managing accounts, transactions, and spending across ARS/USD/EUR with blue and official exchange rates. Deployed on a Hostinger VPS via Dokploy. UI text is in **Spanish**; all code (variables, functions, DB fields, routes) is in **English**.

## Commands

Run from the repository root:

```bash
npm run dev              # Start Vite (port 5173) + nodemon concurrently
npm run dev:server       # Backend only (nodemon)
npm run dev:client       # Frontend only (Vite, proxies /api → :3000)
npm run build            # Build React → client/dist
npm start                # Production: node server/src/index.js
npm run install:all      # Install root + client + server dependencies
npm test                 # Unit tests (Node.js built-in --test runner)
npm run test:integration # Integration tests (requires DATABASE_URL_TEST)
npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Open Prisma Studio GUI
```

There is no linting script configured at the root level.

## Architecture

### Monorepo structure

Single Express server at `server/` serves the REST API (`/api/*`) and the built React SPA (`client/dist`). During development, Vite proxies `/api` to port 3000.

### Backend (`server/src/`)

- **`app.js`** — `createApp()` factory (enables isolated test instances). Registers all middleware and routes.
- **`index.js`** — Entry point: validates env, calls `createApp()`, starts listening.
- **`routes/`** — 6 route files (auth, accounts, transactions, categories, reports, exchange-rates). Every route validates with Zod before processing.
- **`services/transaction.service.js`** — Core balance logic. All balance mutations (`applyTransaction`, `reverseTransaction`) use `prisma.$transaction()` for atomicity.
- **`middleware/auth.middleware.js`** — JWT verification; attaches `req.userId`.
- **`middleware/errorHandler.js`** — Zod errors → 400, unexpected errors → 500.
- **`utils/prisma.js`** — Prisma singleton.

### Frontend (`client/src/`)

- **`App.jsx`** — Routing + context provider nesting. `PrivateRoute` → `AppLayout`; `GuestRoute` for auth pages.
- **`components/layout/AppLayout.jsx`** — Wraps all authenticated pages: Sidebar, Header, MobileDrawer, FloatingActionButton, TransactionModal, OnboardingWizard.
- **`services/api.js`** — Axios instance with `/api` base URL, credentials, and 401 → `/login` interceptor. Domain service files (`accounts.js`, `transactions.js`, etc.) import from here.
- **Context providers** (nested in order): ThemeContext → AuthContext → DialogContext → TransactionModalContext → OnboardingContext.

### Database (Prisma + PostgreSQL)

Key schema invariants:
- `amount` is always in the account's native currency (ARS/USD/EUR).
- `amountArs` is always the ARS-equivalent used for all aggregations and reports.
- Both `balance` and `balanceArs` on accounts are updated atomically.
- For cross-currency transfers, `amountArs` acts as the bridge value.
- Use Prisma `Decimal` type for money fields — never JS `number`.

### API conventions

- All routes prefixed with `/api`.
- Success: `{ data: ... }`, error: `{ error: "message" }`.
- Every route verifies resource ownership against `req.userId`.
- Auth routes are rate-limited (10 attempts / 15 minutes).

## Known Issues

1. **Account deletion blocked** — Returns 400 if the account has transactions. Should cascade-delete them instead.
2. **`balanceArs` not recalculated on account edit** — Recalc only triggers on currency changes, not name/type edits.
3. **Google OAuth users don't get default categories** — Default category seeding only happens on email/password registration.
4. **Duplicate `AccountCard` component** — Two implementations exist: `components/accounts/` and `components/general/`. Needs consolidation.

## Testing

- Uses Node.js built-in test runner (`--test`), not Jest or Vitest.
- Unit tests: `server/test/*.test.js`
- Integration tests: `server/test/integration/` (requires a separate `DATABASE_URL_TEST` database)
- Test helpers in `server/test/helpers/`: `server.js`, `db.js`, `factories.js`, `auth.js`

## Environment Variables

See `.env.example`. Required:
- `DATABASE_URL`, `DATABASE_URL_TEST` (for integration tests)
- `JWT_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `PORT` (default 3000), `NODE_ENV`
