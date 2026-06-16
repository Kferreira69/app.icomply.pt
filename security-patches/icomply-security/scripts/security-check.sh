#!/bin/bash
# scripts/security-check.sh
# Auditoria de segurança da app.icomply.pt
# Correr no servidor: bash security-check.sh https://app.icomply.pt

set -euo pipefail

TARGET="${1:-https://app.icomply.pt}"
API_TARGET="${2:-https://api.icomply.pt}"
PASS=0
FAIL=0
WARN=0

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS${NC} — $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗ FAIL${NC} — $1"; ((FAIL++)); }
warn() { echo -e "  ${YELLOW}⚠ WARN${NC} — $1"; ((WARN++)); }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }

echo ""
echo "════════════════════════════════════════════"
echo "  iComply.pt — Security Check"
echo "  Alvo: $TARGET"
echo "  Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════"

# Obter headers
HEADERS=$(curl -sI "$TARGET" 2>/dev/null)
API_HEADERS=$(curl -sI "$API_TARGET" 2>/dev/null)

echo ""
echo "─── 1. TLS / HTTPS ────────────────────────"

# Verificar redirect HTTP → HTTPS
HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" "http://${TARGET#https://}" 2>/dev/null || echo "000")
if [[ "$HTTP_STATUS" == "301" || "$HTTP_STATUS" == "308" ]]; then
  pass "Redirect HTTP → HTTPS (301/308)"
else
  fail "Sem redirect HTTP → HTTPS (status: $HTTP_STATUS)"
fi

# Verificar TLS version
TLS_VERSION=$(curl -svo /dev/null "$TARGET" 2>&1 | grep "SSL connection\|TLSv" | head -1)
if echo "$TLS_VERSION" | grep -q "TLSv1\.[23]"; then
  pass "TLS versão adequada ($TLS_VERSION)"
else
  warn "Verificar versão TLS manualmente: $TLS_VERSION"
fi

echo ""
echo "─── 2. SECURITY HEADERS ───────────────────"

check_header() {
  local header_name="$1"
  local header_value_pattern="$2"
  local description="$3"

  if echo "$HEADERS" | grep -qi "^${header_name}:"; then
    local value=$(echo "$HEADERS" | grep -i "^${header_name}:" | head -1)
    if [[ -z "$header_value_pattern" ]] || echo "$value" | grep -qi "$header_value_pattern"; then
      pass "$description"
    else
      warn "$description (presente mas valor inadequado: $value)"
    fi
  else
    fail "$description (ausente)"
  fi
}

check_header "strict-transport-security" "max-age" "HSTS"
check_header "content-security-policy" "" "Content-Security-Policy"
check_header "x-content-type-options" "nosniff" "X-Content-Type-Options: nosniff"
check_header "x-frame-options" "DENY\|SAMEORIGIN" "X-Frame-Options"
check_header "referrer-policy" "" "Referrer-Policy"
check_header "permissions-policy" "" "Permissions-Policy"
check_header "cross-origin-opener-policy" "" "Cross-Origin-Opener-Policy"

# Headers que NÃO devem estar presentes
echo ""
echo "─── 3. HEADERS SENSÍVEIS EXPOSTOS ─────────"

if echo "$HEADERS" | grep -qi "^server: "; then
  SERVER=$(echo "$HEADERS" | grep -i "^server:" | head -1)
  if echo "$SERVER" | grep -qi "nginx\|apache\|iis\|traefik"; then
    warn "Header Server expõe tecnologia: $SERVER"
  else
    pass "Header Server não expõe versão"
  fi
else
  pass "Header Server não presente"
fi

if echo "$HEADERS" | grep -qi "^x-powered-by:"; then
  fail "X-Powered-By presente: $(echo "$HEADERS" | grep -i '^x-powered-by:')"
else
  pass "X-Powered-By não presente"
fi

if echo "$HEADERS" | grep -qi "^x-aspnet-version:"; then
  fail "X-AspNet-Version exposto"
else
  pass "X-AspNet-Version não presente"
fi

echo ""
echo "─── 4. RATE LIMITING ──────────────────────"

# Testar se há rate limiting no endpoint de login
info "Testando rate limit em $API_TARGET/api/v1/auth/login..."
RATE_LIMIT_HIT=false
for i in {1..15}; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    "$API_TARGET/api/v1/auth/login" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "429" ]]; then
    RATE_LIMIT_HIT=true
    pass "Rate limiting ativo (429 após $i tentativas)"
    break
  fi
done
if [[ "$RATE_LIMIT_HIT" == "false" ]]; then
  fail "Sem rate limiting detetado em /auth/login (15 tentativas sem 429)"
fi

echo ""
echo "─── 5. COOKIES ────────────────────────────"

# Fazer login e verificar cookies
COOKIE_RESPONSE=$(curl -si -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  "$API_TARGET/api/v1/auth/login" 2>/dev/null)

if echo "$COOKIE_RESPONSE" | grep -qi "set-cookie:"; then
  COOKIE_LINE=$(echo "$COOKIE_RESPONSE" | grep -i "set-cookie:" | head -1)
  echo "  Cookie detetado: $COOKIE_LINE"

  if echo "$COOKIE_LINE" | grep -qi "httponly"; then
    pass "Cookie com HttpOnly"
  else
    fail "Cookie SEM HttpOnly (vulnerável a XSS)"
  fi

  if echo "$COOKIE_LINE" | grep -qi "secure"; then
    pass "Cookie com Secure flag"
  else
    fail "Cookie SEM Secure flag"
  fi

  if echo "$COOKIE_LINE" | grep -qi "samesite=strict\|samesite=lax"; then
    pass "Cookie com SameSite"
  else
    warn "Cookie sem SameSite definido"
  fi
else
  info "Sem Set-Cookie na resposta de login (pode ser esperado)"
fi

echo ""
echo "─── 6. INFORMAÇÃO EXPOSTA EM ERROS ────────"

# Testar endpoint inexistente — não deve expor stack trace
ERROR_RESPONSE=$(curl -s "$API_TARGET/api/v1/endpoint-que-nao-existe-12345" 2>/dev/null)
if echo "$ERROR_RESPONSE" | grep -qi "Error\|stack\|at Object\|at Function\|node_modules"; then
  fail "Stack trace exposto em respostas de erro"
else
  pass "Sem stack trace em respostas de erro"
fi

# CORS — não deve aceitar origens arbitrárias
echo ""
echo "─── 7. CORS ───────────────────────────────"

CORS_RESPONSE=$(curl -si -H "Origin: https://evil-hacker.com" "$API_TARGET/api/v1/health" 2>/dev/null)
if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin: \*\|access-control-allow-origin: https://evil-hacker.com"; then
  fail "CORS permissivo — aceita origens arbitrárias"
else
  pass "CORS restrito (não aceita origens arbitrárias)"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  RESULTADO FINAL"
echo "═══════════════════════════════════════════"
echo -e "  ${GREEN}✓ PASS: $PASS${NC}"
echo -e "  ${YELLOW}⚠ WARN: $WARN${NC}"
echo -e "  ${RED}✗ FAIL: $FAIL${NC}"
TOTAL=$((PASS + FAIL + WARN))
SCORE=$(echo "scale=0; ($PASS * 100) / $TOTAL" | bc 2>/dev/null || echo "N/A")
echo ""
echo -e "  Score de Segurança: ${SCORE}% (${PASS}/${TOTAL})"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "  ${RED}⚠ Existem $FAIL falhas críticas a corrigir.${NC}"
  exit 1
else
  echo -e "  ${GREEN}✓ Sem falhas críticas detetadas.${NC}"
  exit 0
fi
