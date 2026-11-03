## Changelog

<!-- Paste the output of: git log --first-parent --format='- %s' origin/main..origin/develop -->

## Migrations in this release

<!-- List each migration and confirm it follows expand/contract (deploys are start-first, so it must be safe with the previous release still running). Write "None" if there are no migrations. -->

- [ ] `<migration name>`: expand/contract confirmed

## Required env and secret changes

<!-- Variables or secrets to add/change in Dokploy or GitHub environments before merging. Write "None" if not needed. -->

## Verified on development

- [ ] `DEV_HEALTH_URL` reports the develop sha
- [ ] Flows in `docs/deployment.md` § Promotion checks
