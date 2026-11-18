# Gastar

Personal finance PWA for Argentina. It answers two questions: how much money do I have, and how is my month going.
Public sign-up (email + password, email verification required, password reset by link). Deployed as a Docker image via Dokploy on the user's VPS.

## Documentation

| Need                                                  | File                             |
| ----------------------------------------------------- | -------------------------------- |
| Product scope, screens, locale/formatting, rules      | `docs/scope.md`                  |
| Tables, money representation, invariants              | `docs/data-model.md`             |
| Branching, PRs, CI gate, script contract, deploy flow | `docs/WORKFLOW.md` (shared)      |
| Environments, secrets, Dokploy, rollback, promotion   | `docs/deployment.md`             |
| Production env vars, creating users                   | `README.md`                      |
| Product audience/tone; visual system                  | `PRODUCT.md`, `DESIGN.md` (root) |

## Stack

SvelteKit 3 + TypeScript, Drizzle ORM + Postgres (`src/lib/server/db/schema.ts`), Better Auth (`src/lib/server/auth.ts`), Tailwind 4 + shadcn-svelte (bits-ui) components in `src/lib/components/ui`, Geist Mono via `@fontsource-variable/geist-mono`, Playwright (E2E), pnpm.

## Rules

- Language: code, routes, DB schema, identifiers, comments, commits and docs in English; user-facing UI text in Spanish (`docs/scope.md`).
- Money: stored as integer minor units (bigint cents); exchange rate as integer hundredths (`rate x 100`); a movement's currency is derived from its account, never stored (`docs/data-model.md`).
- Balances and category net are computed at read time, never persisted (`docs/data-model.md`).
- All account/movement access checks go through one server-side ownership helper (e.g. `canAccessAccount`); no other code path checks ownership (`docs/data-model.md`).
- Migrations: generate with `pnpm db:generate` and commit the files; never hand-edit or edit an already-applied migration; the one exception is a fresh `pnpm db:generate --custom` migration, which may hold hand-written SQL drizzle-kit can't express (views, data backfills) (`docs/WORKFLOW.md`).
- Migrations and rollouts: deploys are start-first (the new container starts while the old one still serves, both on the same DB) and migrations run at container start, so every migration must be backward-compatible with the previous release. Expand/contract: add nullable/defaulted columns first; drop or rename only in a later release, once no running code uses them (`docs/WORKFLOW.md`).
- Branches: `feat/`, `fix/`, `chore/` or `docs/` prefix; feature branches squash-merge into `develop` via PR; `develop` is promoted to `main` by a merge-commit PR (never squash); PR titles follow Conventional Commits (`docs/WORKFLOW.md`).
- `develop` auto-deploys dev.gastar.app on merge; `main` auto-deploys production (web.gastar.app) on merge (`docs/WORKFLOW.md`).
- Design: UI work starts from root `PRODUCT.md` and `DESIGN.md`; update `DESIGN.md` when the visual system changes. UI text stays Spanish (es-AR) per `docs/scope.md`. Design skills live in `.claude/skills/`, vendored unchanged from [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, commit `715c180`): `emil-design-eng` for UI polish and component decisions, `mobile-native` for touch, viewport, input and PWA behavior, `gestures` for drag, swipe and drawer interactions, `review-animations` to review motion, `break-ui` to stress a screen with worst-case data (its toggle and fixture stay dev-only and are not tests). Phone-only behavior (input zoom, safe areas, keyboard, overscroll, tap feedback) is confirmed on a real phone, not only in device emulation. To update a skill, re-copy it from upstream and bump the commit here.
- Testing: unit tests are not required and are not kept in the repo; cover behavior with integration tests or Playwright E2E (`e2e/`). E2E covers money, data, auth and cross-user isolation flows only. No layout/pixel/viewport, animation, touch-target, colour or copy tests; one representative test per error class; no duplicated assertions across specs; no `waitForTimeout`, and `networkidle` only as a commented hydration guard before a JS-only control (the app exposes no hydration marker). Keep the suite around 125 tests and CI e2e under ~5 min; before adding a test, check it is not already covered.

## Commands

```sh
pnpm dev           # vite dev --host 127.0.0.1 (loopback only)
# git hooks install automatically on `pnpm install` (husky: pre-commit: lint-staged + gitleaks via docker, skipped with a warning if the docker CLI is missing, the commit is blocked if the docker engine is not running; pre-push: prettier --check on files changed vs upstream + pnpm typecheck:fast)
pnpm build         # vite build
pnpm typecheck     # svelte-kit sync && svelte-check (what CI runs)
pnpm typecheck:fast # same check on TS 7 native (--tsgo-experimental-api; plain --tsgo reports false errors), used by pre-push
pnpm lint          # prettier --check . && eslint .
pnpm format        # prettier --write .
pnpm test:e2e      # playwright test (Chromium; reuses a running `pnpm dev`, else builds with VITE_E2E=1 and serves `node build`; needs a migrated + seeded DB)
pnpm db:generate   # drizzle-kit generate
pnpm db:deploy     # node scripts/migrate.js (loads .env if present)
pnpm db:seed       # node scripts/seed.js, local demo data (loads .env; requires SEED_PASSWORD)
pnpm test:e2e:setup # pnpm db:seed (CI runs it after db:deploy, before test:e2e)
pnpm db:studio     # drizzle-kit studio
pnpm user:create   # node scripts/create-user.js (loads .env if present)
```

## Before declaring work complete

Run the checks `.github/workflows/ci.yml` runs (CI also runs `pnpm install --frozen-lockfile` first; agents do not install dependencies):

```sh
pnpm lint
pnpm typecheck
pnpm build
```

UI-affecting PRs: run `mobile-native` when touch, viewport or input behavior changed and `review-animations` when motion changed; the PR description names the skills run and what still needs a real-phone check.

Playwright E2E (`pnpm test:e2e`, needs a migrated + seeded DB; CI and any run without a dev server build with VITE_E2E=1 and serve `node build`) runs in CI on pull requests; run it locally when a change touches a flow covered by `e2e/`.
