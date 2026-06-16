#!/bin/bash
# scripts/setup-secrets.sh
# Inicializar Docker Secrets para produção
# Correr UMA VEZ no servidor de produção
# Uso: bash setup-secrets.sh

set -euo pipefail

echo "🔐 Configuração de Docker Secrets — iComply.pt Production"
echo ""

# Verificar se estamos em Swarm mode (necessário para Docker Secrets)
if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
  echo "ℹ Inicializando Docker Swarm..."
  docker swarm init --advertise-addr "$(hostname -I | awk '{print $1}')" 2>/dev/null || \
  docker swarm init 2>/dev/null || \
  echo "  Swarm já inicializado."
fi

# Função para criar secret interativamente
create_secret() {
  local name="$1"
  local description="$2"

  if docker secret inspect "$name" &>/dev/null; then
    echo "  ⚠ Secret '$name' já existe (não alterado)"
    return
  fi

  echo ""
  echo "  📝 $description"
  echo -n "  Valor: "
  read -rs value
  echo ""

  echo -n "$value" | docker secret create "$name" -
  echo "  ✓ Secret '$name' criado"
}

# Gerar secret aleatório seguro
generate_secret() {
  local name="$1"
  local description="$2"
  local length="${3:-64}"

  if docker secret inspect "$name" &>/dev/null; then
    echo "  ⚠ Secret '$name' já existe (não alterado)"
    return
  fi

  local value
  value=$(openssl rand -hex "$length")
  echo -n "$value" | docker secret create "$name" -
  echo "  ✓ Secret '$name' gerado automaticamente"
}

echo "─── Secrets de JWT ─────────────────────────"
generate_secret "jwt_access_secret"  "JWT Access Token Secret (gerado automaticamente)" 32
generate_secret "jwt_refresh_secret" "JWT Refresh Token Secret (gerado automaticamente)" 32
generate_secret "cookie_secret"      "Cookie Secret (gerado automaticamente)" 32

echo ""
echo "─── Secrets de Base de Dados ───────────────"
create_secret "database_url" "URL completo da base de dados PostgreSQL (ex: postgresql://user:pass@postgres:5432/icomply_prod)"
create_secret "redis_url"    "URL do Redis (ex: redis://:password@redis:6379)"

echo ""
echo "─── Verificação ────────────────────────────"
echo "  Secrets criados:"
docker secret ls

echo ""
echo "✅ Setup concluído. Iniciar os serviços com:"
echo "   docker stack deploy -c docker-compose.prod.yml icomply"
