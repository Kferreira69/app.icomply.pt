# iComply — Makefile de atalhos
# Uso: make <comando> [ENV=staging]
# Exemplos:
#   make up           → start produção
#   make up ENV=staging → start staging
#   make logs         → logs em tempo real
#   make shell        → shell no backend

ENV ?= production
ENV_FILE := .env.$(ENV)
COMPOSE := docker compose -f docker-compose.vps.yml --env-file $(ENV_FILE)

# ── Local development ──────────────────────────────────────────
dev:
	docker compose up -d postgres minio redis
	@echo "✓ Infra local a correr. Agora: cd backend && npm run start:dev"

dev-all:
	docker compose up -d

dev-down:
	docker compose down

# ── VPS Production / Staging ───────────────────────────────────
up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

build:
	$(COMPOSE) build --no-cache

deploy:
	git pull origin main
	$(COMPOSE) build backend frontend
	$(COMPOSE) up -d --no-deps backend frontend
	@echo "✅ Deploy concluído para $(ENV)"

logs:
	$(COMPOSE) logs -f --tail=100

logs-backend:
	docker logs icomply_backend -f --tail=100

logs-frontend:
	docker logs icomply_frontend -f --tail=100

ps:
	$(COMPOSE) ps

# ── Database ──────────────────────────────────────────────────
migrate:
	docker exec icomply_backend npx prisma migrate deploy

seed:
	docker exec icomply_backend npm run db:seed

backup:
	@DATE=$$(date +%Y%m%d_%H%M%S); \
	mkdir -p ./backups; \
	docker exec icomply_postgres pg_dump -U icomply icomply_db | gzip > ./backups/icomply_$$DATE.sql.gz; \
	echo "✅ Backup: ./backups/icomply_$$DATE.sql.gz"

restore:
	@echo "Uso: gunzip -c ./backups/<ficheiro>.sql.gz | docker exec -i icomply_postgres psql -U icomply icomply_db"

# ── Shells ────────────────────────────────────────────────────
shell:
	docker exec -it icomply_backend sh

shell-db:
	docker exec -it icomply_postgres psql -U icomply icomply_db

# ── Health ────────────────────────────────────────────────────
health:
	@echo "=== Produção ==="
	@curl -s https://api.icomply.pt/api/v1/health | python3 -m json.tool 2>/dev/null || curl -s https://api.icomply.pt/api/v1/health
	@echo "\n=== Staging ==="
	@curl -s https://api.staging.icomply.pt/api/v1/health | python3 -m json.tool 2>/dev/null || echo "(staging não disponível)"

.PHONY: dev dev-all dev-down up down restart build deploy logs logs-backend logs-frontend ps migrate seed backup restore shell shell-db health
