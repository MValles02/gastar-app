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

# Install server dependencies
COPY server/package.json ./server/
RUN npm --prefix server install --omit=dev

COPY server/ ./server/

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy server with production node_modules
COPY --from=builder /app/server ./server

# Copy built React frontend into server's public directory
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/src/index.js"]
