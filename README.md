# gastar-app

A personal finance tracker built for people who want clarity over their money — not complexity. Track income, expenses, and transfers across multiple accounts, organize by custom categories, and get meaningful reports without fighting the tool.

Built with a strong emphasis on code quality: feature-based architecture, typed end-to-end, and tested business logic.

---

## Why

Most finance apps are either too simple (no multi-account support) or too heavy (enterprise-grade for personal use). Gastar sits in the middle — a production-grade full-stack app that handles the real complexity of personal finance (multi-currency, transfers, category analytics) without the bloat.

It also serves as a reference implementation for a clean Node.js monorepo: React + Express + Prisma + TypeScript, feature-based architecture on both sides, and a test suite using the Node.js built-in runner.

---

## Features

### Accounts
- Multiple account types: checking, savings, credit card, cash, investment
- Multi-currency support — track balances in ARS and foreign currencies (USD, EUR)
- Consolidated balance view across all accounts

### Transactions
- Three types: **Income**, **Expense**, **Transfer**
- Category and account assignment on every transaction
- Exchange rate recording for foreign currency entries, with automatic ARS conversion
- Filtering by date range, account, category, and type
- Paginated listing (20 per page)

### Categories
- Fully custom — create, rename, assign icons, delete
- Used for filtering and all report breakdowns

### Dashboard
- Consolidated balance across all accounts
- Recent transactions (last 8)
- Spending breakdown by category
- Monthly summary metrics

### Reports
- **Monthly balances**: income vs. expenses vs. net flow, per month, for a selected year
- **Spending by category**: filtered by date range, accounts, and categories
- **Transaction frequency**: pattern analysis over a date range

### Authentication
- Email/password with secure password reset via email
- Google OAuth (Sign in with Google)
- Onboarding wizard for first-time users

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6 |
| Backend | Node.js 20, Express 4, TypeScript |
| Database | PostgreSQL via Prisma 5 ORM |
| Auth | JWT, bcrypt, Google OAuth |
| Validation | Zod |
| Email | Resend |
| Security | Helmet (CSP), express-rate-limit |

---

## Project Structure

```
gastar-app/
├── client/                    # React frontend
│   └── src/
│       ├── features/          # One folder per domain
│       │   ├── auth/
│       │   ├── accounts/
│       │   ├── transactions/
│       │   ├── categories/
│       │   ├── dashboard/
│       │   ├── reports/
│       │   └── onboarding/
│       └── shared/            # Cross-cutting components, hooks, utils
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── features/          # One folder per domain
│   │   │   ├── auth/
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── categories/
│   │   │   ├── reports/
│   │   │   └── exchange-rates/
│   │   └── shared/            # Middleware, types, utilities
│   ├── prisma/                # Schema and migrations
│   └── test/                  # Unit and integration tests
│
└── package.json               # Monorepo workspace root
```

Both layers follow the same principle: **features are isolated, shared is truly shared**. No domain leaks into another.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/your-username/gastar-app.git
cd gastar-app
npm install
```

### 2. Configure environment variables

Create a `.env` file inside the `server/` directory:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/gastar"
JWT_SECRET="your-jwt-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Email — password reset (optional)
RESEND_API_KEY="your-resend-api-key"

# App URL
APP_URL="http://localhost:5173"
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development servers

```bash
npm run dev
```

This starts both the Vite dev server (client, port 5173) and the Express server (port 3000) concurrently.

---

## Available Scripts

Run from the repo root:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start client and server in dev mode |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express server only |
| `npm run build` | Build client for production |
| `npm run test` | Run server unit tests |
| `npm run test:integration` | Run server integration tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Lint all code |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type-check all TypeScript |

---

## API Overview

All data routes require a valid JWT (via cookie).

| Resource | Endpoint |
|----------|---------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Password reset | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Google OAuth | `GET /api/auth/google`, `GET /api/auth/google/callback` |
| Accounts | `GET /api/accounts`, `POST /api/accounts`, `PATCH /api/accounts/:id`, `DELETE /api/accounts/:id` |
| Transactions | `GET /api/transactions`, `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id` |
| Categories | `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` |
| Reports | `GET /api/reports/summary`, `/monthly`, `/by-category`, `/frequency` |
| Exchange rates | `GET /api/exchange-rates` |

---

## Architecture Decisions

**Feature-based, not layer-based.** Files that change together live together. `features/transactions/` contains routes, service, and validators — not `routes/transactions.ts` + `services/transactions.ts` spread across the tree.

**Zod at the boundary.** All incoming request data is validated with Zod before it touches a service. Prisma handles the persistence layer. Business logic lives in services, not routes.

**Prisma transactions for integrity.** Any operation that updates multiple records (e.g., creating a transaction and updating an account balance) uses `prisma.$transaction()` — no partial writes.

**Node.js built-in test runner.** No Jest, no Vitest. The native `--test` flag handles unit and integration tests. Fewer dependencies, same capability for this scope.

---

## License

MIT
