# Stage 1: Build the React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies (concurrently, etc.)
COPY package.json ./
RUN npm install

# Install and build client
COPY client/package.json ./client/
RUN npm --prefix client install

COPY client/ ./client/
RUN npm --prefix client run build

# Install server dependencies (production only)
COPY server/package.json ./server/
RUN npm --prefix server install --omit=dev

COPY server/ ./server/

# Generate Prisma client for production
RUN npm --prefix server run db:generate

# Stage 2: Production image
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy server with production node_modules
COPY --from=builder /app/server ./server

# Copy built React frontend into server's public directory
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "server/node_modules/.bin/prisma migrate deploy --schema server/prisma/schema.prisma && node server/src/index.js"]
