# CLAUDE.md — gastar-app

AI assistant rules and project conventions for this codebase. These instructions override defaults.

## Project Overview

**gastar-app** is a full-stack personal finance tracker built as a Node.js monorepo. Users track income, expenses, and transfers across multiple accounts, organize by categories, and generate financial reports — with multi-currency support (ARS, USD, EUR).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + React Router DOM 6 |
| Backend | Node.js 20 + Express 4 + TypeScript + Prisma 5 (PostgreSQL) |
| Auth | JWT + bcrypt + Google OAuth |
| Validation | Zod (server-side only) |
| Email | Resend |
| Security | Helmet CSP + express-rate-limit |
| Monorepo | `client/` and `server/` npm workspaces |

## Architecture

- **Feature-based** in both layers: `features/<domain>/` — no domain leaks into another
- **Shared layer**: `shared/` in both client and server for cross-cutting utilities
- Server feature anatomy: `<domain>.routes.ts`, `<domain>.service.ts`, `<domain>.validators.ts`
- Client feature anatomy: components + hooks + types colocated inside the feature folder
- Context-based state (no global state library): `AuthContext`, `DialogContext`, etc.
- Express serves the compiled React client as static files in production

## Rules

- NEVER build after making changes — do not run `npm run build`
- NEVER run `cat`, `grep`, `find`, `sed`, or `ls` in shell — use the dedicated Read/Grep/Glob tools
- NEVER add AI attribution or "Co-Authored-By" to commits
- Commits follow **Conventional Commits** format: `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- When asking a question — STOP. Do not continue until the user responds
- Never agree with a claim without verifying in the code first

## Code Conventions

### Formatting
- Prettier: single quotes, 2 spaces, 100 char line width, ES5 trailing commas, LF line endings
- Unused variables: prefix with `_` to suppress ESLint warnings
- ESLint v9 flat config (`eslint.config.mjs`) — run `npm run lint` before committing

### TypeScript
- Target: ES2022 (server), ESNext (client via Vite)
- `strict` mode enabled — no implicit `any`
- Zod schemas are the source of truth for request validation on the server

### React
- Functional components only — no class components
- `prop-types` validation required (ESLint enforced)
- `react-hooks/exhaustive-deps` enforced — never suppress this rule without a comment explaining why
- Prefer custom hooks to logic inside components

### Database
- Prisma is the ONLY way to interact with the database — no raw SQL
- Use `prisma.$transaction()` for any operation that updates multiple records atomically
- Migrations via `npm run db:migrate` — never edit migration files manually

## Testing

- **Runner**: Node.js built-in `--test` flag (no Jest, no Vitest)
- **Unit tests**: `server/test/*.test.js`
- **Integration tests**: `server/test/integration/*.test.js`
- **Helpers & factories**: `server/test/helpers/`
- Run tests: `npm test` (unit) or `npm run test:integration`
- Write tests for every new service function — no untested business logic

## Environment Variables

Required to run the app:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URL |
| `RESEND_API_KEY` | Email delivery (password reset) |
| `APP_URL` | App base URL |

## Key File Paths

| Path | Purpose |
|------|---------|
| `client/src/features/` | React feature modules |
| `client/src/shared/` | Shared components, hooks, services, utils |
| `server/src/features/` | Express route handlers by domain |
| `server/src/shared/` | Middleware, types, utilities |
| `server/prisma/schema.prisma` | Database schema |
| `server/test/` | All test files |
| `.atl/skill-registry.md` | SDD skill registry |
