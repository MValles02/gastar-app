# Gastar

Personal finance PWA for Argentina. It answers two questions: how much money do I have, and how is my month going.
Invite-only (email + password, no public signup). Deployed as a Docker image via Dokploy on the user's VPS.

## Documentation

| Need                                                  | File                             |
| ----------------------------------------------------- | -------------------------------- |
| Product scope, screens, locale/formatting, rules      | `docs/SCOPE.md`                  |
| Tables, money representation, invariants              | `docs/DATA_MODEL.md`             |
| Branching, PRs, CI gate, deploy, migrations, rollback | `docs/WORKFLOW.md`               |
| Production env vars, creating users                   | `README.md`                      |
| Product audience/tone (impeccable); visual system     | `PRODUCT.md`, `DESIGN.md` (root) |

## Stack

SvelteKit 2 + TypeScript, Drizzle ORM + Postgres (`src/lib/server/db/schema.ts`), Better Auth (`src/lib/server/auth.ts`), plain component CSS + `@fontsource/dm-sans`, Vitest, pnpm.

## Design

- UI work starts from the design: read root `PRODUCT.md` and `DESIGN.md` first.
- Use `/impeccable` commands: `craft`/`shape` for new screens, `audit`/`polish` before the PR.
- UI text stays Spanish (es-AR) per `docs/SCOPE.md`.
- The skill binary is not committed; after cloning run `npx impeccable install` (project scope).
- The design hook is local (`.claude/settings.local.json`, gitignored).

## Rules

- Language: code, routes, DB schema, identifiers, comments, commits and docs in English; user-facing UI text in Spanish (`docs/SCOPE.md`).
- Money: stored as integer minor units (bigint cents); exchange rate as integer hundredths (`rate x 100`); a movement's currency is derived from its account, never stored (`docs/DATA_MODEL.md`).
- Balances and category net are computed at read time, never persisted (`docs/DATA_MODEL.md`).
- All account/movement access checks go through one server-side ownership helper (e.g. `canAccessAccount`); no other code path checks ownership (`docs/DATA_MODEL.md`).
- Migrations: generate with `pnpm db:generate` and commit the files; never hand-edit or edit an already-applied migration (`docs/WORKFLOW.md`).
- Migrations run at container start and must be backward-compatible with the previous release; use expand/contract over two deploys for breaking changes (`docs/WORKFLOW.md`).
- Migrations and rollouts: deploys are start-first (the new container starts while the old one still serves, both on the same DB) and migrations run at container start, so every migration must be backward-compatible with the previous release. Expand/contract: add nullable/defaulted columns first; drop or rename only in a later release, once no running code uses them.
- Branches: `feat/`, `fix/`, `chore/` or `docs/` prefix; merge to `main` via PR, squash only; PR titles follow Conventional Commits (`docs/WORKFLOW.md`).
- `main` auto-deploys on merge (`docs/WORKFLOW.md`).

## Commands

```sh
pnpm dev           # vite dev --host 127.0.0.1 (loopback only)
pnpm hooks:install # git config core.hooksPath scripts/git-hooks (gitleaks pre-commit, needs docker)
pnpm build         # vite build
pnpm check         # svelte-kit sync && svelte-check
pnpm lint          # prettier --check . && eslint .
pnpm format        # prettier --write .
pnpm test          # vitest run --passWithNoTests
pnpm test:e2e      # playwright test (Chromium; reuses a running `pnpm dev`, needs a migrated + seeded DB)
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # node scripts/migrate.js (loads .env if present)
pnpm db:studio     # drizzle-kit studio
pnpm user:create   # node scripts/create-user.js (loads .env if present)
```

## Before declaring work complete

Run the checks `.github/workflows/ci.yml` runs (CI also runs `pnpm install --frozen-lockfile` first; agents do not install dependencies):

```sh
pnpm lint
pnpm check
pnpm test
pnpm build
```
