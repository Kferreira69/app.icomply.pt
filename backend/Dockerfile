# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (layer-cache friendly)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client + compile TypeScript
# prisma.config.ts (Prisma 7) resolves DATABASE_URL via env() even for `generate`,
# which needs no real DB connection — a placeholder unblocks the build; the real
# value is injected at container runtime via docker-compose `environment:`.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl

# Production deps + ts-node (needed for prisma/seed.ts on demand)
COPY package*.json ./
RUN npm install --omit=dev && \
    NODE_ENV= npm install --no-save ts-node && \
    npm cache clean --force

# Compiled app
COPY --from=builder /app/dist ./dist

# Prisma client (generated binary for linux-musl)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI, pinned to the version installed at build time — prevents
# docker-entrypoint.sh's `npx prisma` from silently fetching npm's `latest`
# dist-tag on every container start.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Schema + migrations (needed for prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma

# prisma.config.ts (v7: datasource URL + seed command live here, not in schema.prisma)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generated Prisma Client source (safety net for any non-.ts assets the
# generator emits that tsc's dist/ compile step wouldn't copy)
COPY --from=builder /app/src/generated ./src/generated

# Seed tsconfig (needed for npm run seed)
COPY --from=builder /app/tsconfig.seed.json ./tsconfig.seed.json

# Entrypoint (runs migrations then starts server)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
