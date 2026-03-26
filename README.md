# Gastar

> Track your finances in pesos and dollars.

Gastar is a personal finance tracker built for Argentina. Manage your accounts, record income and expenses, and understand where your money goes — all with full support for ARS, USD, and EUR, and your preferred exchange rate (blue or official).

**Try it at [gastar.app](https://gastar.app)**

![Dashboard screenshot](docs/screenshots/dashboard.png)
<!-- TODO: Replace with actual dashboard screenshot -->

## Features

### Accounts
- Multiple account types: checking, savings, credit card, cash, and investment
- Multi-currency balances in ARS, USD, and EUR
- Unified ARS-equivalent total across all accounts

### Transactions
- Record income, expenses, and transfers between accounts
- Cross-currency transfers with exchange rate (cotización) tracking
- User-defined categories with icons — 13 defaults included on signup

### Reports
- Spending breakdown by category
- Monthly income and expense trends
- Transaction frequency analysis

### Exchange Rates
- Real-time ARS/USD and ARS/EUR rates powered by [DolarAPI](https://dolarapi.com)
- Choose between the **blue** or **official** exchange rate per your preference

### Other
- Light and dark theme
- Sign in with Google or email and password
- Secure: JWT authentication, rate limiting, and security headers

## Screenshots

| Dashboard | New Transaction |
|-----------|----------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![New Transaction](docs/screenshots/new-transaction.png) |
| <!-- TODO: Replace with actual screenshot --> | <!-- TODO: Replace with actual screenshot --> |

| Mobile | Dark Mode |
|--------|-----------|
| ![Mobile view](docs/screenshots/mobile.png) | ![Dark mode](docs/screenshots/dark-mode.png) |
| <!-- TODO: Replace with actual screenshot --> | <!-- TODO: Replace with actual screenshot --> |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Lucide React |
| HTTP Client | Axios |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT (HTTP-only cookies) + bcrypt + Google OAuth |
| Email | Resend |
| Exchange Rates | [DolarAPI](https://dolarapi.com) |
| Security | Helmet + express-rate-limit |
| Deployment | Dokploy on Hostinger VPS |
| Structure | Monorepo — Express serves both the API and the React build from the same origin |
