# syntax=docker/dockerfile:1

# Pinned by digest; Dependabot (docker ecosystem) bumps it.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS base
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Build-only placeholders for SvelteKit's module load-time analysis; real values come from runtime env
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-used-at-runtime BETTER_AUTH_URL=http://localhost:3000 DATABASE_URL=postgres://build:build@localhost:5432/build pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle ./drizzle
COPY scripts/migrate.js ./scripts/migrate.js
COPY scripts/create-user.js ./scripts/create-user.js
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node scripts/migrate.js && exec node build"]
