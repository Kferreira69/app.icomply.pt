# .env.example
# COPIAR para .env.local (dev) ou usar Docker Secrets (produção)
# NUNCA fazer commit do .env com valores reais
# NUNCA usar NEXT_PUBLIC_ para valores secretos

# ─────────────────────────────────────────────
# APLICAÇÃO
# ─────────────────────────────────────────────
NODE_ENV=development                    # development | staging | production
PORT=3001

# ─────────────────────────────────────────────
# BASE DE DADOS
# ─────────────────────────────────────────────
# Em produção: usar Docker Secret (não variável de ambiente)
DATABASE_URL=postgresql://icomply:CHANGE_ME@localhost:5432/icomply_dev

# ─────────────────────────────────────────────
# REDIS
# ─────────────────────────────────────────────
REDIS_URL=redis://:CHANGE_ME@localhost:6379

# ─────────────────────────────────────────────
# JWT — gerar com: openssl rand -hex 32
# ─────────────────────────────────────────────
JWT_ACCESS_SECRET=GENERATE_WITH_openssl_rand_hex_32
JWT_REFRESH_SECRET=GENERATE_WITH_openssl_rand_hex_32_different

# ─────────────────────────────────────────────
# COOKIES
# ─────────────────────────────────────────────
COOKIE_SECRET=GENERATE_WITH_openssl_rand_hex_32

# ─────────────────────────────────────────────
# EMAIL (para reset de passwords)
# ─────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@icomply.pt
SMTP_PASS=CHANGE_ME
SMTP_FROM="iComply.pt <noreply@icomply.pt>"

# ─────────────────────────────────────────────
# NEXT.JS (FRONTEND) — apenas variáveis PÚBLICAS com NEXT_PUBLIC_
# ─────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_ANALYTICS_ID=        # opcional

# ─────────────────────────────────────────────
# NUNCA colocar aqui com NEXT_PUBLIC_:
# - DATABASE_URL
# - JWT_*SECRET
# - SMTP_PASS
# - API keys privadas
# ─────────────────────────────────────────────

---
# .gitignore — adicionar estas entradas
.env
.env.local
.env.production
.env.staging
# Manter apenas:
# .env.example  ← commit este ficheiro
