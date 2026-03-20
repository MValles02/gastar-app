# CLAUDE.md — Finance Tracker Project

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
| Auth | JWT (jsonwebtoken) + bcrypt | Stateless authentication |
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

## Deployment

- **Hosting:** Hostinger VPS running Dokploy
- **Containers:** One app container (React + Express) and one PostgreSQL container (separate Dokploy service)
- **CI/CD:** Dokploy connects to GitHub repo and auto-deploys on push
- **Domain:** Custom domain purchased through Hostinger

## Database schema

Four core tables with these relationships:

### users
- `id` — UUID, primary key
- `email` — String, unique
- `password_hash` — String (never store plain passwords)
- `name` — String
- `reset_token` — String, nullable (for password reset flow)
- `reset_token_expiry` — DateTime, nullable (1-hour expiry)
- `created_at` — Timestamp, default now

### accounts
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id
- `name` — String (e.g., "Bank of X", "Cash", "Credit Card Y")
- `type` — String (checking, savings, credit_card, cash, investment)
- `balance` — Decimal (calculated from transactions)
- `currency` — String, default "ARS"

### categories
- `id` — UUID, primary key
- `user_id` — UUID, foreign key → users.id
- `name` — String (e.g., "Food", "Rent", "Salary")
- `type` — String (income or expense)
- `icon` — String, optional

### transactions
- `id` — UUID, primary key
- `account_id` — UUID, foreign key → accounts.id
- `category_id` — UUID, foreign key → categories.id
- `type` — String (income, expense, transfer)
- `amount` — Decimal (always positive, type determines sign)
- `description` — String, optional
- `date` — Date
- `transfer_to` — UUID, foreign key → accounts.id, nullable (only for transfers)
- `created_at` — Timestamp, default now

## MVP features

1. **Authentication** — Register, login, logout with JWT tokens stored in HTTP-only cookies
2. **Password reset** — Forgot password flow with email via Resend (token-based, 1-hour expiry)
3. **Account management** — CRUD for financial accounts (bank, cash, credit card)
4. **Transaction management** — Create, read, update, delete incomes, expenses, and transfers with atomic balance updates
5. **Categories** — CRUD for transaction categories with type (income/expense); 13 default Spanish categories seeded on registration
6. **Reports & charts** — Visual summaries of spending by category, income vs expenses over time
7. **Dashboard** — Balance overview, spending pie chart, recent transactions

## API route conventions

All API routes are prefixed with `/api`. Follow RESTful conventions:

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

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

## Project structure

```
gastar-app/
├── client/                  # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components (ui/, accounts/, categories/, dashboard/, transactions/, layout/)
│   │   ├── pages/           # Page-level components (routes)
│   │   ├── context/         # React context providers (auth, theme, transaction modal)
│   │   ├── services/        # API call functions (Axios)
│   │   ├── utils/           # Helper functions (formatting, etc.)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Prisma migration history
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   ├── middleware/       # Auth middleware, error handler
│   │   ├── services/        # Business logic (transactions, categories, email)
│   │   ├── validators/      # Zod validation schemas
│   │   ├── utils/           # Server helpers (token generation, Prisma client)
│   │   └── index.js         # Express app entry point
│   └── package.json
├── .env.example             # Template for environment variables
├── .gitignore
├── package.json             # Root package.json (scripts to run both)
├── Dockerfile               # Multi-stage build for Dokploy
├── docker-compose.yml       # Local dev database (PostgreSQL)
├── nixpacks.toml            # Alternative deployment config
├── CLAUDE.md                # This file
└── README.md
```

## Environment variables (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5433/gastar-app
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=development

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
APP_URL=https://your-domain.com
EMAIL_FROM=Gastar <noreply@gastar.app>

# Docker Compose (local dev DB)
POSTGRES_USER=gastar_admin
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=gastar-app
```

## Key scripts (root package.json)

- `npm run install:all` — Installs dependencies for root, client, and server
- `npm run dev` — Starts both client (Vite dev server) and server (nodemon) concurrently
- `npm run build` — Builds the React app for production
- `npm start` — Runs the production server (serves built React + API)
- `npm run db:migrate` — Runs Prisma migrations
- `npm run db:studio` — Opens Prisma Studio (database GUI)

## Dockerfile strategy

Multi-stage build:
1. Stage 1: Install dependencies and build the React frontend
2. Stage 2: Copy built frontend + server code, install production dependencies only
3. Express serves the React build as static files and handles API routes

## Important notes

- All monetary amounts use Decimal type (never floating point) to avoid rounding errors
- Passwords are hashed with bcrypt before storage (never store plain text)
- JWT tokens are sent via HTTP-only cookies or Authorization header
- The frontend uses React Router for client-side navigation
- Vite dev server proxies `/api` requests to Express during development
- In production, Express serves everything from a single port
