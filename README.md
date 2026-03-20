# Gastar App

Personal finance tracker for managing incomes, expenses, and transfers between accounts. Provides visual reports to answer "where does my money go?"

## Tech Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, Recharts, React Router
- **Backend:** Node.js + Express
- **ORM:** Prisma
- **Auth:** JWT + bcrypt
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

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development

```bash
npm run dev
```

The React dev server runs on `http://localhost:5173` and proxies `/api` requests to Express on `http://localhost:3000`.

## Production

```bash
npm run build   # Build React frontend
npm start       # Serve everything from Express on PORT
```
