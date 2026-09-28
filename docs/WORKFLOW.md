# Workflow

## Branching & PRs

- `main` is production; it auto-deploys on every merge (skipped for
  doc-only changes).
- All work happens on feature branches, named `feat/`, `fix/`, `chore/`, or
  `docs/` (e.g. `feat/expense-filters`).
- Branches merge to `main` via pull request, **squash merge only**.
- PR titles follow Conventional Commits (`feat: ...`, `fix: ...`,
  `chore: ...`, `docs: ...`) since the squash commit uses the PR title.

## CI gate

A GitHub ruleset on `main` requires the `checks` and `gitleaks` status checks
and only allows merges through pull requests (squash), so this is a hard
block, not just convention:

- `.github/workflows/ci.yml` runs on every pull request: install, lint,
  check, test, build, and a `docker build` (no push).
- `.github/workflows/deploy.yml` re-runs the same CI workflow (via
  `workflow_call`) before publishing, so a merge can never deploy code that
  didn't pass checks, even if a PR was merged without waiting for CI.

## Deploy pipeline

On push to `main` (or manual `workflow_dispatch`):

1. `checks` — re-runs CI.
2. `publish` — builds the Docker image and pushes it to GHCR as
   `ghcr.io/mvalles02/gastar-app:latest` and
   `ghcr.io/mvalles02/gastar-app:sha-<full sha>`.
3. `deploy` — calls the Dokploy deploy webhook to redeploy the application.

Required GitHub secrets:

- `DOKPLOY_WEBHOOK_URL` — the app's deploy webhook URL (Dokploy → app →
  Deployments → Webhook URL); it can only redeploy this app, and you can
  regenerate it there if it leaks. The app must have Auto Deploy enabled for
  the webhook to be accepted.
- `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` — a Cloudflare Access
  service token (`github-actions-deploy`) that the deploy step sends as
  `CF-Access-Client-Id`/`CF-Access-Client-Secret` headers, since
  `dokploy.mateovalles.cloud/api/deploy*` is protected by Cloudflare Access.
  The step fails if any of these three secrets is missing.

Required GitHub variable:

- `HEALTH_URL` — the health check URL the `deploy` job polls after
  triggering the webhook, waiting for it to report the new commit SHA before
  smoke-testing the site's home page. The job fails if it is not set.

(`GITHUB_TOKEN` is provided automatically and used to push to GHCR.)

## Dokploy app expectations

- Image: `ghcr.io/mvalles02/gastar-app:latest`, pulled with registry
  credentials for private GHCR.
- Health check path: `/health`.
- Rollbacks enabled.
- Runtime env vars: see the Production section of the [README](../README.md).

## Migrations

- Generate SQL with `pnpm db:generate` (drizzle-kit) and commit the generated
  files — never hand-edit or edit an already-applied migration.
- Migrations run automatically at container start (see `Dockerfile`), so they
  must be backward-compatible with the previous release: a rollback restores
  the old image, not the old database.
- Use expand/contract for breaking changes, split over two deploys. Example,
  renaming a column:
  1. Deploy 1: add the new column, backfill it, write to both columns, read
     from the old one.
  2. Deploy 2: switch reads to the new column, stop writing the old one, then
     drop it in a later migration.

## Backups

- Enable Dokploy's Postgres backups before the first production deploy.
- Restoring from a backup is a manual, deliberate operation — it is not part
  of the automated rollback path.

## Rollback

1. In Dokploy, roll back the application to the previous image tag
   (`sha-<full sha>`).
2. Because migrations are backward-compatible, the old image keeps working
   against the current schema — no database rollback needed.
3. Only restore a database backup if data itself was corrupted, and treat
   that as a separate, deliberate operation.
