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
| `PORT`                | Port to listen on (default `3000`)                    |

Migrations run automatically on container start and must be backward-compatible
with the previously running version (rolling deploys may briefly run old and
new code against the same schema).