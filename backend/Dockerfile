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

# Only production deps
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Compiled app
COPY --from=builder /app/dist ./dist

# Prisma client (generated binary for linux-musl)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ts-node + typescript — needed to run prisma/seed.ts on demand
COPY --from=builder /app/node_modules/ts-node ./node_modules/ts-node
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder /app/node_modules/@tsconfig ./node_modules/@tsconfig
COPY --from=builder /app/node_modules/acorn ./node_modules/acorn
COPY --from=builder /app/node_modules/yn ./node_modules/yn
# Create symlink so `ts-node` is on PATH (npm scripts add node_modules/.bin to PATH)
RUN ln -sf /app/node_modules/ts-node/bin/ts-node /app/node_modules/.bin/ts-node

# Schema + migrations (needed for prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Entrypoint (runs migrations then starts server)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
