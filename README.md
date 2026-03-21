# Gastar

Personal finance tracker for managing incomes, expenses, and transfers between accounts. Provides visual reports and summaries to answer "where does my money go?" Built for a Spanish-speaking (Argentine) audience.

**Features:** User authentication, onboarding wizard, account management, transaction tracking, category management, spending reports, and financial dashboard.

## Tech Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, Recharts, Lucide React, React Router
- **Backend:** Node.js + Express, Zod validation
- **ORM:** Prisma
- **Auth:** JWT (HTTP-only cookies) + bcrypt
- **Email:** Resend (password reset)
- **Database:** PostgreSQL

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd gastar-app
npm run install:all
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Start the database

Use an existing PostgreSQL instance and update `DATABASE_URL` in `.env`.

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Start development

```bash
npm run dev
```

The React dev server runs on `http://localhost:5173` and proxies `/api` requests to Express on `http://localhost:3000`.

## Production

```bash
npm run build   # Build React frontend
npm start       # Serve everything from Express on PORT
```

In production, Express serves both the built React app and the API from a single port.

## Deployment

Deployed on a Hostinger VPS running Dokploy with nixpacks. One app container (React + Express) and one PostgreSQL container. Dokploy auto-deploys on push to the GitHub repo. Migrations run automatically on startup.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret for signing JWT tokens | — |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `RESEND_API_KEY` | Resend API key for sending emails | — |
| `APP_URL` | App URL for email links | `https://gastar.app` |
| `EMAIL_FROM` | Sender address for emails | `Gastar <noreply@gastar.app>` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run install:all` | Install all dependencies (root, client, server) |
| `npm run dev` | Start client + server concurrently |
| `npm run build` | Build React frontend for production |
| `npm run sonar` | Run SonarQube analysis from the repo root |
| `npm start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio GUI |

## SonarQube Analysis

This repo is configured for root-level analysis with `@sonar/scan`.

Set the required runtime variables before running the scan:

```bash
SONAR_HOST_URL=<your-sonarqube-url>
SONAR_TOKEN=<your-sonar-token>
```

If you use SonarCloud, also set:

```bash
SONAR_ORGANIZATION=<your-org-key>
```

Then run:

```bash
npm run sonar
```

Override the default project key temporarily if needed:

```bash
npm run sonar -- -Dsonar.projectKey=<your-project-key>
```
