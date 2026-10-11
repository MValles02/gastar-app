## Changelog

<!-- Paste the output of: git log --first-parent --format='- %s' origin/main..origin/develop -->

## Migrations in this release

<!-- List each migration and confirm it follows expand/contract (deploys are start-first and migrations run at container start, so it must be safe with the previous release still running). Write "None" if there are no migrations. -->

- [ ] `<migration name>`: expand/contract confirmed

## Required env/secret changes before deploy

<!-- Variables or secrets to add/change in Dokploy or GitHub environments before merging. Write "None" if not needed. -->

## Verified on dev.gastar.app

- [ ] Sign-up with email verification
- [ ] Login
- [ ] Add a movement
- [ ] `/health` reports the develop SHA
