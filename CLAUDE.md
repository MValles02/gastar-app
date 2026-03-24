# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal finance tracker web application. Users can manage their money by tracking incomes, expenses, and transfers between their own accounts. The app provides visual reports and summaries to answer "where does my money go?"

## Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18+ with Vite | UI, routing, state management |
| HTTP Client | Axios | API calls with interceptors |
| Styling | Tailwind CSS | Responsive design (PC + mobile) |
| Icons | Lucide React | UI iconography |
| Charts | Recharts | Financial data visualization |
| Backend | Node.js + Express | REST API, auth middleware, business logic |
| ORM | Prisma | Type-safe database queries and migrations |
| Validation | Zod | Request body and query validation |
| Auth | JWT (jsonwebtoken) + bcrypt + Google OAuth | Stateless authentication |
| Email | Resend | Transactional emails (password reset) |
| Database | PostgreSQL | Relational data storage |

## Language Policy

- **All code** (variable names, function names, classes, comments, file names, database fields, API routes, etc.) must be written in **English**.
- **All UI text** (labels, buttons, messages, placeholders, error messages, navigation, etc.) must be written in **Spanish**, as the primary audience is based in Argentina.

## Architecture

This is a **monorepo** where Express serves both the API and the built React frontend as static files. In production, a single process handles everything — no CORS configuration needed.

- Frontend makes API calls to `/api/*` endpoints on the same origin
- Express serves the React build from `/` and API routes from `/api`
- Prisma connects to PostgreSQL via `DATABASE_URL` environment variable
- `server/src/app.js` exports a `createApp()` factory that wires up Express without starting the server — this enables integration tests to spin up isolated instances. `server/src/index.js` is the actual entrypoint that calls `createApp()` and `.listen()`.

## Deployment

- **Hosting:** Hostinger VPS running Dokploy
- **Containers:** One app container (React + Express) and one PostgreSQL container (separate Dokploy service)
- **CI/CD:** Dokploy connects to GitHub repo and auto-deploys on push
- **Domain:** Custom domain purchased through Hostinger

## Database schema

### users
- `id` — UUID, primary key
- `email` — String, unique
- `passwordHash` — String, **nullable** (null for Google OAuth users)
- `name` — String
- `googleId` — String, nullable, unique (set for Google OAuth users)
- `resetToken` — String, nullable
- `resetTokenExpiry` — DateTime, nullable (1-hour expiry)
- `createdAt` — Timestamp, default now

### accounts
- `id` — UUID, primary key
- `userId` — UUID, foreign key → users.id
- `name` — String
- `type` — String (checking, savings, credit_card, cash, investment)
- `balance` — Decimal, native currency balance
- `balanceArs` — Decimal, ARS-equivalent balance (for multi-currency support)
- `currency` — String, default "ARS"

### categories
- `id` — UUID, primary key
- `userId` — UUID, foreign key → users.id
- `name` — String
- `icon` — String, optional

### transactions
- `id` — UUID, primary key
- `accountId` — UUID, foreign key → accounts.id
- `categoryId` — UUID, foreign key → categories.id
- `type` — String (income, expense, transfer)
- `amount` — Decimal, always positive in native currency
- `cotizacion` — Decimal, nullable — exchange rate at time of transaction (non-ARS accounts only)
- `amountArs` — Decimal, ARS equivalent of `amount`
- `description` — String, optional
- `date` — Date
- `transferTo` — UUID, foreign key → accounts.id, nullable (transfers only)
- `createdAt` — Timestamp, default now

**Multi-currency note:** When an account's currency is not ARS, `cotizacion` stores the exchange rate used, and `amountArs` stores the converted value. Both `balance` (native) and `balanceArs` are kept in sync atomically on every transaction mutation. Cross-currency transfers credit the destination account in its native units using the ARS amount as the bridge.

## MVP features

1. **Authentication** — Register, login, logout with JWT tokens stored in HTTP-only cookies; Google OAuth via `/api/auth/google`
2. **Password reset** — Forgot password flow with email via Resend (token-based, 1-hour expiry)
3. **Onboarding** — Multi-step wizard for new users to set up initial accounts and categories
4. **Account management** — CRUD for financial accounts (bank, cash, credit card)
5. **Transaction management** — Create, read, update, delete incomes, expenses, and transfers with atomic balance updates
6. **Categories** — CRUD for transaction categories (any category can be used with any transaction type); 13 default Spanish categories seeded on registration
7. **Reports & charts** — Visual summaries of spending by category, income vs expenses over time
8. **Dashboard** — Balance overview, spending pie chart, recent transactions

## Key scripts

```bash
# Root (runs both client and server)
npm run dev              # Start dev servers (Vite + nodemon)
npm run build            # Build React for production
npm start                # Run production server
npm run install:all      # Install all dependencies

# Database
npm run db:migrate       # Run Prisma migrations (uses dotenv-cli with ../.env)
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma client after schema changes

# Testing (run from root or server/)
npm test                 # Run unit tests
npm run test:integration # Run integration tests (requires DATABASE_URL_TEST)

# Run a single test file
node --test server/test/transaction.service.test.js
```

## Testing

Tests live in `server/test/` and use **Node.js built-in test runner** (`node --test`) — no Jest or Mocha.

- **Unit tests:** `server/test/*.test.js` — test validators, services, and utilities in isolation
- **Integration tests:** `server/test/integration/*.test.js` — spin up a real Express server against `DATABASE_URL_TEST`, reset the database between tests via `resetDb()`
- **Test helpers:** `server/test/helpers/` — `server.js` (starts test server), `db.js` (Prisma reset/disconnect), `factories.js` (seed helpers for users, accounts, categories)

Integration tests require a separate test database set via `DATABASE_URL_TEST`. They use real HTTP requests (`fetch`) and real Prisma queries — no mocking.

## API route conventions

All API routes are prefixed with `/api`. Follow RESTful conventions:

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/google
GET    /api/auth/google/callback

GET    /api/accounts
POST   /api/accounts
PUT    /api/accounts/:id
DELETE /api/accounts/:id

GET    /api/transactions?account_id=&category_id=&from=&to=
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/reports/summary?from=&to=
GET    /api/reports/by-category?from=&to=
```

## Code conventions

- Use ES modules (`import/export`) everywhere
- Use `async/await` for all asynchronous operations
- Validate request bodies and query params with Zod (schemas in `server/src/validators/`)
- Return consistent JSON response shapes: `{ data: ... }` on success, `{ error: "message" }` on failure
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error
- Environment variables go in `.env` (never committed to git)
- Prisma schema lives at `server/prisma/schema.prisma`

## Environment variables (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/gastar-app
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/gastar-app-test
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=development

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
APP_URL=https://gastar.app
EMAIL_FROM=Gastar <noreply@gastar.app>

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://gastar.app/api/auth/google/callback
```

## Important notes

- All monetary amounts use Decimal type (never floating point) to avoid rounding errors
- JWT tokens are sent via HTTP-only cookies or Authorization header
- The frontend uses React Router for client-side navigation
- Vite dev server proxies `/api` requests to Express during development
- In production, Express serves everything from a single port
- PWA manifest enables "Add to Home Screen" with standalone display (no service worker / no offline support)
- `DialogContext` provides a global imperative confirmation dialog used throughout the app
- `TransactionModalContext` controls the global transaction composer modal (opened via the FAB or inline edit)
