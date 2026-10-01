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
| `BETTER_AUTH_URL`     | Public https URL of the app                           |
| `ORIGIN`              | Same public https URL (adapter-node CSRF check)       |
| `ADDRESS_HEADER`      | `CF-Connecting-IP`. MUST be set in Dokploy BEFORE (or with) deploying this release: the app refuses to start in production without it |
| `PORT`                | Port to listen on (default `3000`)                    |

`CF-Connecting-IP` is trustworthy only because the origin accepts Cloudflare IPs only (firewall ipset); if the origin is ever exposed directly, the header is spoofable.

Migrations run automatically on container start and must be backward-compatible
with the previously running version (rolling deploys may briefly run old and
new code against the same schema).

The Content-Security-Policy is report-only; violations are posted to `/csp-report` and logged as `csp-violation` lines.

### Creating users

Signup is disabled; users are created from inside the running container
(e.g. via the Dokploy container terminal):

```sh
docker exec -it <container> node scripts/create-user.js <email> "<name>"
```