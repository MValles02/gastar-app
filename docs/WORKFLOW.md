# Workflow

## Branching & PRs

- `develop` is the integration branch; every push auto-deploys
  https://dev.gastar.app (image tag `:develop`, `development` GitHub
  environment). Dependabot PRs target `develop`.
- `main` is production (https://web.gastar.app, `production` GitHub
  environment); it auto-deploys on every merge (skipped for doc-only changes).
- All work happens on feature branches, named `feat/`, `fix/`, `chore/`, or
  `docs/` (e.g. `feat/expense-filters`).
- Feature branches merge into `develop` via pull request, **squash merge
  only**.
- PR titles follow Conventional Commits (`feat: ...`, `fix: ...`,
  `chore: ...`, `docs: ...`) since the squash commit uses the PR title.
- `develop` is promoted to `main` through a pull request with a **merge
  commit**. Never squash the promotion: it creates a commit on `main` that
  `develop` does not have, so the branches diverge.

Open the promotion PR with the template, then paste the changelog under
`## Changelog`:

```bash
gh pr create --base main --head develop --template .github/PULL_REQUEST_TEMPLATE/promotion.md
git log --first-parent --format='- %s' origin/main..origin/develop
```

`gh pr create --template` takes a file path, not a template name. In the web UI
use `?template=promotion.md` in the compare URL instead.

## Design

- UI-affecting PRs reference the design pass (`/impeccable shape` or `craft`
  for new screens).
- Run `/impeccable audit` (and `polish`) before opening the PR.
- Update root `DESIGN.md` when the visual system changes.
- Fresh clones: run `npx impeccable install` (project scope); the skill
  binary is gitignored.

## CI gate

Two GitHub rulesets make this a hard block, not just convention. Force push
and deletion are blocked on both branches:

- `develop`: pull requests only, squash merge only, required status checks
  `checks`.
- `main`: pull requests only, merge commit only, required status checks
  `checks` and `develop-only`. `develop-only` comes from
  `.github/workflows/promotion-guard.yml`: rulesets cannot restrict a PR's
  source branch, so this check fails unless the PR head is `develop` of this
  repository.

- `.github/workflows/ci.yml` runs on every pull request: a gitleaks scan of
  the PR's commits only, install, lint, check, build (all in `checks`), and
  Playwright E2E against a production build made with `VITE_E2E=1`.
- `.github/workflows/deploy.yml` does not re-run CI: the checks run on the PR
  and are required by the ruleset, so they are not repeated on push.

## Deploy pipeline

On push to `main` or `develop` (or manual `workflow_dispatch` from either):

1. `publish` — builds the Docker image and pushes it to GHCR as
   `ghcr.io/mvalles02/gastar-app:latest` (main) or
   `ghcr.io/mvalles02/gastar-app:develop` (develop), plus
   `ghcr.io/mvalles02/gastar-app:sha-<full sha>`.
2. `deploy` — calls the Dokploy deploy webhook to redeploy the application.
   Push to `main` uses the `production` environment and `HEALTH_URL`; push to
   `develop` uses the `development` environment and `DEV_HEALTH_URL`
   (`https://dev.gastar.app/health`). Environment branch policies limit
   `production` to `main` and `development` to `develop`.

Each environment (`production`, `development`) holds its own secrets:

- `DOKPLOY_WEBHOOK_URL` — the app's deploy webhook URL (Dokploy → app →
  Deployments → Webhook URL); it can only redeploy this app, and you can
  regenerate it there if it leaks. The app must have Auto Deploy enabled for
  the webhook to be accepted.
- `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` — a Cloudflare Access
  service token (`github-actions-deploy`) that the deploy step sends as
  `CF-Access-Client-Id`/`CF-Access-Client-Secret` headers, since
  `dokploy.mateovalles.cloud/api/deploy*` is protected by Cloudflare Access.
  The step fails if any of these three secrets is missing.

Required GitHub variables:

- `HEALTH_URL` (main) / `DEV_HEALTH_URL` (develop) — the health check URL the
  `deploy` job polls after triggering the webhook, waiting for it to report
  the new commit SHA before smoke-testing the site's home page. The job fails
  if the one for its branch is not set.

(`GITHUB_TOKEN` is provided automatically and used to push to GHCR.)

## Dokploy app expectations

- Image: `ghcr.io/mvalles02/gastar-app:latest`, pulled with registry
  credentials for private GHCR.
- Health check path: `/health`.
- Rollbacks enabled.
- Runtime env vars: see the Production section of the [README](../README.md).

Development uses a separate Dokploy app, `gastar-app-dev`:

- Image: `ghcr.io/mvalles02/gastar-app:develop`.
- Its own Postgres database — never the production DB.
- Domain `dev.gastar.app`; `BETTER_AUTH_URL` and `ORIGIN` are
  `https://dev.gastar.app`.
- Its own `BETTER_AUTH_SECRET`; other env vars as in the README.

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

## Local development

- `pnpm dev` binds to loopback (`127.0.0.1`, Vite default port 5173).
- Database and seed setup: see the README "Local development" section.
- Git hooks install automatically on `pnpm install` (husky `prepare`). The
  pre-commit hook runs lint-staged (eslint + prettier on staged files) and a
  gitleaks scan of staged changes via docker; the scan is skipped with a
  warning if docker is missing. On Windows it needs Docker Desktop running.
