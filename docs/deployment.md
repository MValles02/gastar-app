# Deployment

Gastar-specific deployment details. The shared pipeline, CI gate and script contract are in [WORKFLOW.md](WORKFLOW.md).

## Environments

| Environment   | Branch    | GitHub environment | URL                    | Image tag                           |
| ------------- | --------- | ------------------ | ---------------------- | ----------------------------------- |
| `development` | `develop` | `development`      | https://dev.gastar.app | `ghcr.io/mvalles02/gastar-app:develop` |
| `production`  | `main`    | `production`       | https://web.gastar.app | `ghcr.io/mvalles02/gastar-app:latest`  |

Every push to `develop` auto-deploys dev; every merge to `main` auto-deploys production (skipped for doc-only changes). Environment branch policies limit `production` to `main` and `development` to `develop`. Dependabot PRs target `develop`.

Each image is also tagged `sha-<full sha>`.

## Secrets and variables

Each GitHub environment (`production`, `development`) holds its own secrets:

- `DOKPLOY_WEBHOOK_URL`: the app's deploy webhook URL (Dokploy, app, Deployments, Webhook URL). It can only redeploy this app and can be regenerated there if it leaks. The app must have Auto Deploy enabled for the webhook to be accepted.
- `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`: a Cloudflare Access service token (`gastar-app-deploy`) sent as `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers, since `dokploy.mateovalles.com/api/deploy*` is protected by Cloudflare Access. The deploy step fails if any of these three secrets is missing.

Required GitHub variables:

- `HEALTH_URL` (main) / `DEV_HEALTH_URL` (develop): the health check URL the `deploy` job polls after triggering the webhook, waiting for it to report the new commit SHA before smoke-testing the home page. `DEV_HEALTH_URL` is `https://dev.gastar.app/health`. The job fails if the one for its branch is not set.

`GITHUB_TOKEN` is provided automatically and used to push to GHCR. Runtime env vars: see the Production section of the [README](../README.md).

## Dokploy

Production app:

- Image: `ghcr.io/mvalles02/gastar-app:latest`, pulled with registry credentials for private GHCR.
- Health check path: `/health`.
- Rollbacks enabled.

Development uses a separate Dokploy app, `gastar-app-dev`:

- Image: `ghcr.io/mvalles02/gastar-app:develop`.
- Its own Postgres database, never the production DB.
- Domain `dev.gastar.app`; `BETTER_AUTH_URL` and `ORIGIN` are `https://dev.gastar.app`.
- Its own `BETTER_AUTH_SECRET`; other env vars as in the README.

Migrations run automatically at container start (see `Dockerfile`, `scripts/migrate.js`).

Backups: enable Dokploy's Postgres backups before the first production deploy. Restoring from a backup is a manual, deliberate operation, not part of the automated rollback path.

## Rollback

1. In Dokploy, roll back the application to the previous image tag (`sha-<full sha>`).
2. Because migrations are backward-compatible, the old image keeps working against the current schema, so no database rollback is needed.
3. Exception: migration 0021 added the `visa_debit` import source (Gmail Visa debit alerts). Rolling back past it requires deleting the `visa_debit` rows of `mp_import_items` first (and, if wanted, the movements they created), because the older release does not know that source.
4. Only restore a database backup if data itself was corrupted, and treat that as a separate, deliberate operation.

## Promotion checks

Before promoting `develop` to `main`, verify on https://dev.gastar.app:

- Sign-up with email verification, login and password reset.
- Accounts: create and edit an account; balances are correct.
- Movements: create income, expense and transfer; category net and the monthly view update.
- Mercado Pago import, if the change touches it.
- Google sign-in, if the change touches it: sign in and sign up with Google. The production `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stay UNSET until phase 2 (accounts without a password) is merged; only dev sets them.
- `/health` reports the deployed commit SHA.
