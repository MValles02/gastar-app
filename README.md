# gastar-app

## Production

Build the image:

```sh
docker build -t gastar-app .
```

Env vars required at runtime:

| Variable             | Notes                                                |
| -------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                            |
| `BETTER_AUTH_SECRET`  | Strong secret, e.g. `openssl rand -base64 32`         |
| `BETTER_AUTH_URL`     | Public https URL of the app; email links are built from it                           |
| `ORIGIN`              | Same public https URL (adapter-node CSRF check)       |
| `ADDRESS_HEADER`      | `CF-Connecting-IP`. MUST be set in Dokploy BEFORE (or with) deploying this release: the app refuses to start in production without it |
| `RESEND_API_KEY`      | Resend API key restricted to the sending domain. The app refuses to start in production without it |
| `EMAIL_FROM`          | Bare sender address on a domain verified in Resend, e.g. `no-reply@yourdomain`. The app refuses to start in production without it |
| `MP_ACCESS_TOKEN`     | Optional. Mercado Pago access token (secret, never commit or log it). The import is off unless this and `MP_IMPORT_ACCOUNT_ID` are set |
| `MP_IMPORT_ACCOUNT_ID` | Optional. Id of the ARS account that receives the Mercado Pago import; its owner is the only user who sees the import |
| `MP_IMPORT_FROM`      | Optional. First-sync start date `YYYY-MM-DD` (default: 30 days ago) |
| `MP_SYNC_INTERVAL_HOURS` | Optional. Hours between automatic syncs run inside the server process (default `6`, `0` = off). The first run is ~1 minute after start. Only active when the import is configured. E2E sets it to `0`. |
| `MP_API_BASE_URL`     | Optional, tests only. Mercado Pago API base URL (default `https://api.mercadopago.com`) |
| `MP_REPORT_POLL_MS`   | Optional, tests only. Milliseconds between report-ready checks (default `15000`) |
| `PORT`                | Port to listen on (default `3000`)                    |

`CF-Connecting-IP` is trustworthy only because the origin accepts Cloudflare IPs only (firewall ipset); if the origin is ever exposed directly, the header is spoofable.

Migrations run automatically on container start and must be backward-compatible
with the previously running version (rolling deploys may briefly run old and
new code against the same schema).

The Content-Security-Policy is report-only; violations are posted to `/csp-report` and logged as `csp-violation` lines.

### Email (Resend)

Sign-up requires email verification and password reset is by link, both sent through Resend.

1. Verify the sending domain in Resend and add its DNS records (SPF/MX, DKIM, optional DMARC).
2. Create an API key restricted to that domain and set `RESEND_API_KEY` and `EMAIL_FROM`.

In dev with no key, emails go to an in-memory outbox at `/dev/outbox?to=<email>` (404 in production or when a key is set).
Auth rate limits are in-memory and reset on deploy.

### Creating users

Users sign up from the app. To create a pre-verified user from inside the running container
(e.g. via the Dokploy container terminal):

```sh
docker exec -it <container> node scripts/create-user.js <email> "<name>"
```

## Local development

Windows quick start (PowerShell).

1. Prerequisites: Docker Desktop (WSL2 backend; run `wsl --install` and reboot if WSL is missing), running; Node and pnpm. A native Postgres 17 also works if `DATABASE_URL` points at a localhost DB with role/db `gastar` (the seed refuses non-localhost URLs).
2. Install dependencies; the Chromium download is only needed for `pnpm test:e2e`:

   ```powershell
   pnpm install
   pnpm exec playwright install chromium
   ```

3. Create `.env` and set `BETTER_AUTH_SECRET` to the output of this command (works in any shell):

   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. Start Postgres, migrate, seed and run:

   ```powershell
   docker compose up -d     # Postgres on 127.0.0.1:5432
   pnpm db:migrate
   pnpm db:seed             # demo data; safe to re-run (resets only the demo user)
   pnpm dev                 # http://localhost:5173
   ```

Demo login: `demo@gastar.local` / `demo1234` (override with `SEED_EMAIL` / `SEED_PASSWORD`).
The seed refuses to run unless `DATABASE_URL` points at localhost and is safe to re-run.

Two opt-in flags seed a non-local DB (e.g. dev) without creating users:

- `SEED_ALLOW_REMOTE=1` skips only the localhost check (`NODE_ENV=production` is still refused).
- `SEED_EXISTING_USER=<email>` seeds that existing user: deletes only their app data (not login rows), skips password and the second demo user.

`pnpm test:e2e` needs the migrated + seeded DB and reuses a running `pnpm dev`; without one (CI) it builds with `VITE_E2E=1` and serves `node build`.
