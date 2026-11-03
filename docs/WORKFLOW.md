# Workflow

This file is identical in every app repo (gastar-app, parfam-mdq, gastar-app-landing). It is copied from `standards/apps/` in the [infra](https://github.com/mvalles02/infra) repo; edit it there, never here. Repo specifics (Dokploy apps, backups, rollback, promotion checks) live in `docs/deployment.md`.

## Branching

- Work on a feature branch (`feat/`, `fix/`, `chore/`, `docs/`) and open a PR. Commits follow Conventional Commits.
- Repos with `develop` (gastar-app, parfam-mdq): feature branch -> `develop` with **squash**; `develop` -> `main` with a **merge commit**, using the promotion PR template (`.github/PULL_REQUEST_TEMPLATE/promotion.md`). Only `develop` of this repo may be merged into `main` (`develop-only` check).
- Single-environment repos (gastar-app-landing: no `develop`): feature branch -> `main` with **squash**. The same files apply; `develop-only` passes with a notice because the `develop` branch does not exist.
- The default branch is `develop` where it exists, `main` otherwise.

## CI gate

`.github/workflows/ci.yml` runs on every pull request and is called by `deploy.yml` before a manual deploy.

| Check | Required on | What it runs |
| --- | --- | --- |
| `checks` | every PR | gitleaks over the PR commits, `pnpm lint`, `pnpm typecheck`, `pnpm build`, then `db:deploy` and `test` when present |
| `e2e` | every PR | Playwright browser install, `db:deploy`, `test:e2e:setup` when present, `pnpm test:e2e` |
| `develop-only` | PRs into `main` | head must be `develop` of this repo (passes when the repo has no `develop`) |

Both CI jobs run against a throwaway `postgres:17-alpine` (`DATABASE_URL=postgresql://ci:ci@localhost:5432/ci`). `secrets-scan.yml` also scans the commits of every push, on any branch.

## Script contract

Every app `package.json` has `packageManager: pnpm@12.6.0`, `engines.node: ">=24"` and a `prepare` script that contains `husky`.

| Script | Required | Meaning |
| --- | --- | --- |
| `lint` | yes | `prettier --check .` + eslint |
| `typecheck` | yes | static types |
| `build` | yes | builds the deploy artifact |
| `test:e2e` | yes | Playwright |
| `test` | optional | integration tests against `DATABASE_URL` |
| `db:deploy` | optional | apply committed migrations, non-interactive |
| `test:e2e:setup` | optional | seeds needed by e2e, after `db:deploy` |
| `ci:env` | optional | `node scripts/ci-env.mjs <checks\|e2e>` prints non-secret `KEY=VALUE` placeholders |

CI appends the `ci:env` output to `$GITHUB_ENV` after `DATABASE_URL`, so a later line wins. Only integration and E2E tests are written, never unit tests.

## Deploy pipeline

`.github/workflows/deploy.yml`:

1. A push to `main` or `develop` (markdown-only commits excluded) builds the image in GitHub Actions and publishes it to `ghcr.io/<owner>/<repo>` with tags `latest` (main), `develop` (develop) and `sha-<short>`. CI is not repeated on push: it already ran on the PR.
2. The `deploy` job (GitHub environment `production` for `main`, `development` for `develop`) calls the Dokploy webhook with the Cloudflare Access service token.
3. It polls `HEALTH_URL` (`DEV_HEALTH_URL` for develop) until the JSON reports `.status == "ok"` and `.sha` equals the pushed commit, then smoke-tests the home page.
4. A manual run (`workflow_dispatch`) must be started from `main` or `develop` and the typed branch name must match; it runs `ci.yml` first and publishes only after it is green.

## Environments and variables

| Where | Name | Meaning |
| --- | --- | --- |
| Environment secret | `DOKPLOY_WEBHOOK_URL`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` | per environment (`production`, `development`), never at repository level |
| Repository variable | `HEALTH_URL`, `DEV_HEALTH_URL` | health endpoint returning `{"status":"ok","sha":"<commit>"}` |
| Repository variable | `BUILD_ARGS`, `DEV_BUILD_ARGS` | optional multi-line `KEY=VALUE` image build args (production / development); `GIT_SHA` is always passed |

## Migrations

Deploys are start-first: the old and new containers overlap on the same database. Every migration is backward compatible with the previous release (expand/contract). Destructive changes (drop, rename) ship in a later release, after no running version uses the old shape. Never edit an applied migration.

## Required checks are not strict

The rulesets require `checks` and `e2e` but not `strict` ("require branches to be up to date"). This is a deliberate solo-developer tradeoff: with `strict=true` every open PR would have to update and re-run CI after each merge. Semantic conflicts are caught by CI on the target branch after the merge.

## Standards

The files listed in `standards/apps/` of the infra repo are the same in every app repo. From the infra checkout, `node scripts/check-standards.mjs` reports drift; see `standards/README.md` there.
