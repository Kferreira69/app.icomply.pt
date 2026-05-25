# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (layer-cache friendly)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client + compile TypeScript
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl

# Production deps + ts-node (needed for prisma/seed.ts on demand)
COPY package*.json ./
RUN npm install --omit=dev && \
    npm install --no-save ts-node && \
    npm cache clean --force

# Compiled app
COPY --from=builder /app/dist ./dist

# Prisma client (generated binary for linux-musl)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Schema + migrations (needed for prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Entrypoint (runs migrations then starts server)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
