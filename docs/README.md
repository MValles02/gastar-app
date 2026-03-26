# Gastar — Developer Documentation

Gastar is a personal finance tracker for Argentine users. It lets users manage incomes, expenses, and transfers across multiple accounts (including USD/EUR), track spending by category, and visualize monthly trends. The primary audience is people managing money in Argentina, where multi-currency handling (ARS/USD with blue/oficial rates) is a core concern.

This documentation is aimed at developers and AI agents working on the codebase. It covers every feature, its implementation, the rules the code follows, and how to extend things correctly.

---

## Table of Contents

- [Architecture & Deployment](#architecture--deployment)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Dev Setup](#dev-setup)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Frontend Structure](#frontend-structure)
- [Code Conventions](#code-conventions)
- [Known Issues & Planned Work](#known-issues--planned-work)
- [Feature Docs](#feature-docs)
- [Architecture Docs](#architecture-docs)

---

## Architecture & Deployment

This is a **monorepo** with a single Express server that serves both the REST API and the built React frontend as static files. In production, one process handles everything — no CORS configuration needed.

```
Client (React/Vite)  -->  /api/*  -->  Express routes
                     -->  /*      -->  Serves client/dist/index.html
```

- **Frontend** makes API calls to `/api/*` on the same origin
- **Backend** serves the React build from `/` in production
- **Database** is PostgreSQL, accessed exclusively via Prisma
- In development, Vite proxies `/api` requests to Express (configured in `vite.config.js`)

### Deployment

- Hosted on a Hostinger VPS running **Dokploy**
- Two containers: one for the app (React + Express), one for PostgreSQL
- Dokploy connects to the GitHub repo and auto-deploys on every push to the main branch
- Custom domain purchased through Hostinger

### App factory pattern

`server/src/app.js` exports a `createApp()` factory that wires up Express without calling `.listen()`. This allows integration tests to spin up isolated instances. `server/src/index.js` is the real entrypoint that calls `createApp()` and `.listen()`.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | SPA, React Router for client-side routing |
| HTTP Client | Axios | Configured in `client/src/services/api.js` with a 401 interceptor |
| Styling | Tailwind CSS | Responsive (mobile + desktop); custom design tokens in `tailwind.config.js` |
| Icons | Lucide React | Used throughout UI |
| Charts | None (custom CSS) | Spending breakdown uses a custom ranked list with CSS progress bars |
| Backend | Node.js + Express | REST API + static file serving |
| ORM | Prisma | Type-safe queries, migrations in `server/prisma/migrations/` |
| Validation | Zod | All request bodies and query params validated at the route level |
| Auth | JWT + bcrypt + Google OAuth | JWT in HTTP-only cookies; bcrypt for password hashing; `google-auth-library` for OAuth |
| Email | Resend | Transactional emails (password reset only) |
| Database | PostgreSQL | Hosted in a separate Dokploy container |
| Security | Helmet | CSP, security headers on all responses |
| PWA | Web App Manifest | "Add to Home Screen" with standalone display; offline support planned (see Known Issues) |

---

## Monorepo Structure

```
gastar-app/
  client/                   # React frontend (Vite)
    src/
      pages/                # One file per route
      pages/reports/        # Report sub-pages (Balances, SpendByCategory, Frequency)
      components/
        ui/                 # Reusable primitives (Button, Input, Modal, Select, ...)
        layout/             # AppLayout, Sidebar, Header, MobileDrawer, Page
        dashboard/          # Dashboard widgets
        transactions/       # Transaction list, filters, modal, composer
        accounts/           # AccountCard, AccountModal
        categories/         # CategoryList, CategoryModal
        onboarding/         # OnboardingWizard and step components
      context/              # React contexts (Auth, Dialog, TransactionModal, Onboarding, Theme)
      services/             # API call wrappers (one file per domain)
      utils/                # formatters.js, errors.js, propTypes.js
      constants/            # accountTypes.js and other shared enums

  server/
    src/
      app.js                # Express app factory (createApp)
      index.js              # Server entrypoint (calls createApp + listen)
      routes/               # One router file per domain
      services/             # Business logic (transaction.service, exchange-rate.service, ...)
      middleware/           # auth.middleware.js, errorHandler.js
      validators/           # Zod schemas per domain
      utils/                # prisma.js (singleton), token.js, reset-token.js
    prisma/
      schema.prisma         # Source of truth for DB schema
      migrations/           # Auto-generated migration SQL files
    test/
      *.test.js             # Unit tests
      integration/          # Integration tests against a real test DB
      helpers/              # server.js, db.js, factories.js, auth.js

  docs/                     # This documentation
  package.json              # Root — dev scripts, concurrently setup
```

---

## Dev Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)
- A `.env` file at the root (see below)

### Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/gastar-app
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/gastar-app-test
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=development

# Email (Resend) — only needed for password reset
RESEND_API_KEY=your-resend-api-key
APP_URL=https://gastar.app
EMAIL_FROM=Gastar <noreply@gastar.app>

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://gastar.app/api/auth/google/callback
```

### Scripts

```bash
# From root
npm run dev              # Start both Vite dev server and nodemon (concurrently)
npm run build            # Build React for production (outputs to client/dist)
npm start                # Run production server (serves built React + API)
npm run install:all      # Install dependencies in root, client/, and server/

# Database (run from server/)
npm run db:migrate       # Run pending Prisma migrations
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma client after schema changes

# Tests (run from root or server/)
npm test                 # Run all unit tests
npm run test:integration # Run integration tests (requires DATABASE_URL_TEST)

# Run a single test file
node --test server/test/transaction.service.test.js
```

---

## Database Schema

All models are defined in `server/prisma/schema.prisma`. The schema uses Prisma enums for `AccountType` and `TransactionType` (mapped to PostgreSQL native enums).

### users
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String (unique) | |
| passwordHash | String? | Null for Google OAuth users |
| name | String | |
| googleId | String? (unique) | Set for Google OAuth users |
| resetToken | String? | Hashed with SHA-256 before storage |
| resetTokenExpiry | DateTime? | 1-hour expiry |
| cotizacionPreference | String | `"blue"` or `"oficial"`, default `"blue"` |
| createdAt | DateTime | |

### accounts
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| userId | UUID | FK → users.id, cascade delete |
| name | String | |
| type | AccountType | `checking`, `savings`, `credit_card`, `cash`, `investment` |
| balance | Decimal | Native currency balance |
| balanceArs | Decimal | ARS-equivalent balance (for cross-currency aggregation) |
| currency | String | `ARS`, `USD`, or `EUR` |

### categories
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| userId | UUID | FK → users.id, cascade delete |
| name | String | |
| icon | String? | Lucide icon name (e.g., `"utensils"`) |

### transactions
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| accountId | UUID | FK → accounts.id, cascade delete |
| categoryId | UUID | FK → categories.id, cascade delete |
| type | TransactionType | `income`, `expense`, `transfer` |
| amount | Decimal | Always positive, in native currency |
| cotizacion | Decimal? | Exchange rate at time of transaction (non-ARS only) |
| amountArs | Decimal | ARS equivalent; equals `amount` for ARS accounts |
| description | String? | Max 200 characters |
| date | Date | Date only (no time) |
| transferTo | UUID? | FK → accounts.id (transfers only) |
| createdAt | DateTime | |

**Key invariant:** `amount` is always in the account's native currency. `amountArs` is the ARS equivalent used for all aggregations and reports. Both `balance` (native) and `balanceArs` on the account are kept in sync atomically on every create/update/delete.

---

## API Overview

All routes are prefixed with `/api`. Every response follows one of two shapes:

```json
// Success
{ "data": <payload> }

// Error
{ "error": "Human-readable message" }
```

HTTP status codes: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `404` Not Found, `409` Conflict, `500` Internal Server Error.

All protected routes require a valid JWT, sent either as an HTTP-only cookie (`token`) or as a `Bearer` token in the `Authorization` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register with email/password |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/me` | Yes | Get current user |
| PATCH | `/api/auth/me` | Yes | Update profile (cotizacionPreference) |
| DELETE | `/api/auth/me` | Yes | Delete account and all data |
| POST | `/api/auth/forgot-password` | No | Send password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| GET | `/api/auth/google` | No | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/accounts` | Yes | List user's accounts |
| POST | `/api/accounts` | Yes | Create account |
| PUT | `/api/accounts/:id` | Yes | Update account |
| DELETE | `/api/accounts/:id` | Yes | Delete account |
| GET | `/api/transactions` | Yes | List transactions (paginated, filterable) |
| POST | `/api/transactions` | Yes | Create transaction |
| PUT | `/api/transactions/:id` | Yes | Update transaction |
| DELETE | `/api/transactions/:id` | Yes | Delete transaction |
| GET | `/api/categories` | Yes | List user's categories |
| POST | `/api/categories` | Yes | Create category |
| PUT | `/api/categories/:id` | Yes | Update category |
| DELETE | `/api/categories/:id` | Yes | Delete category |
| GET | `/api/reports/summary` | Yes | Balance + income/expense totals |
| GET | `/api/reports/by-category` | Yes | Spend grouped by category |
| GET | `/api/reports/monthly` | Yes | Monthly income/expense by year |
| GET | `/api/reports/frequency` | Yes | Expense count by category |
| GET | `/api/exchange-rates` | Yes | Current USD/EUR rates from dolarapi.com |

See individual feature docs for full request/response shapes and validation rules.

---

## Frontend Structure

### Routing

Routes are defined in `client/src/App.jsx`. Two route guards wrap pages:

- `PrivateRoute` — redirects to `/login` if not authenticated; wraps page in `AppLayout`
- `GuestRoute` — redirects to `/` if already authenticated (login, register, etc.)

### AppLayout

`AppLayout` wraps every authenticated page with: `Sidebar` (desktop nav), `Header` (mobile top bar), `MobileDrawer` (mobile nav), a `FloatingActionButton` (opens the transaction composer), `TransactionModal`, and `OnboardingWizard`. It also provides `TransactionModalProvider` and `OnboardingProvider` to the tree.

### Services

All API calls go through `client/src/services/api.js` — an Axios instance with `baseURL: '/api'`, `withCredentials: true`, and a response interceptor that redirects to `/login` on 401 (except on the `/auth/me` check or when already on an auth page). Domain service files (`accounts.js`, `transactions.js`, etc.) each import this instance and export named async functions.

### Contexts

See [Frontend Contexts](./architecture/frontend-contexts.md) for details. Summary:

| Context | File | Purpose |
|---------|------|---------|
| `ThemeContext` | `context/ThemeContext.jsx` | Light/dark theme, persisted to localStorage |
| `AuthContext` | `context/AuthContext.jsx` | Current user, login/register/logout/updateProfile/deleteAccount |
| `DialogContext` | `context/DialogContext.jsx` | Global imperative confirm/alert dialogs |
| `TransactionModalContext` | `context/TransactionModalContext.jsx` | Global transaction composer modal + refresh signal |
| `OnboardingContext` | `context/OnboardingContext.jsx` | Onboarding wizard state |

Provider nesting order (outermost → innermost): `ThemeProvider` → `DialogProvider` → `AuthProvider` → `TransactionModalProvider` → `OnboardingProvider`.

### Utilities

- `utils/formatters.js` — `formatCurrency`, `formatDate`, `formatDateShort`, `getAccountTypeLabel`, `getTransactionTypeLabel`, `getAmountTone`, `getBalanceTone`
- `utils/errors.js` — `normalizeError`, `getErrorMessage` (extracts human-readable message from Axios errors or plain Error objects)
- `utils/propTypes.js` — shared PropTypes definitions (e.g., `childrenPropType`)

---

## Code Conventions

- **Language**: All code (variable names, function names, comments, file names, DB fields, routes) in **English**. All UI text (labels, buttons, messages, errors) in **Spanish**.
- **Modules**: ES modules (`import`/`export`) everywhere — no `require()`.
- **Async**: Always `async/await`, never raw Promise chains.
- **Validation**: Every request body and query string is validated with Zod at the route level before any business logic runs. Schemas live in `server/src/validators/`.
- **Response shape**: Always `{ data: ... }` on success, `{ error: "message" }` on failure. Never return naked objects.
- **Ownership checks**: Every route that reads or mutates a resource verifies the resource belongs to `req.userId`. Never trust client-provided IDs without a DB ownership check.
- **Atomic balance updates**: All operations that change account balances must be wrapped in a Prisma `$transaction`. Never update balances outside a transaction block.
- **Decimal precision**: All monetary values use Prisma's `Decimal` type (maps to PostgreSQL `DECIMAL`). Never use JavaScript `number` for monetary arithmetic on the server — always `Number()` only when necessary for aggregation, not for storage.
- **Error propagation**: Route handlers call `next(err)` for unexpected errors. The `errorHandler` middleware in `server/src/middleware/errorHandler.js` handles Zod errors (returns 400 with field messages) and all other errors (returns 500).

---

## Known Issues & Planned Work

These are confirmed bugs and planned features as of the time this document was written. Check git history and issues for current status.

### Known Bugs

| Issue | Location | Notes |
|-------|----------|-------|
| Account deletion blocked by transactions | `DELETE /api/accounts/:id` | Should cascade-delete associated transactions. Currently returns 400 if any transactions exist. |
| `balanceArs` not recalculated on account edits | `PUT /api/accounts/:id` | When name or type changes, `balanceArs` is not updated. Only currency changes trigger recalculation. |
| Google OAuth users don't get default categories | `GET /api/auth/google/callback` | Email registration seeds 13 default categories. Google OAuth login does not. New OAuth users start with zero categories. |
| Duplicate `AccountCard` component | `components/accounts/` and `components/general/` | Two implementations exist. Should be unified into `components/accounts/AccountCard.jsx`. |

### Planned Features

| Feature | Notes |
|---------|-------|
| PWA offline support | Transactions created while offline should be queued and synced automatically when connectivity is restored. |
| Additional exchange rate sources | Currently only `dolarapi.com`. May add other providers. |

---

## Feature Docs

- [Authentication](./features/authentication.md) — register, login, Google OAuth, password reset, profile management, account deletion
- [Accounts](./features/accounts.md) — CRUD, multi-currency, balance mechanics
- [Transactions](./features/transactions.md) — CRUD, types (income/expense/transfer), balance engine
- [Categories](./features/categories.md) — CRUD, default categories, seeding
- [Reports](./features/reports.md) — summary, by-category, monthly, frequency
- [Exchange Rates](./features/exchange-rates.md) — dolarapi.com integration, caching, cotizacion preference
- [Onboarding](./features/onboarding.md) — wizard flow, localStorage tracking, re-run

## Architecture Docs

- [Transaction Engine](./architecture/transaction-engine.md) — balance update/reversal logic, atomic operations, cross-currency transfers
- [Frontend Contexts](./architecture/frontend-contexts.md) — all React contexts, their API surface and interactions
- [Testing](./architecture/testing.md) — test runner, unit vs integration, helpers, coverage map
