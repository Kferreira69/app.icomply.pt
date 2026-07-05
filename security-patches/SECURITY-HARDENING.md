# iComply.pt — Security Hardening Report
**Stack:** NestJS + Next.js · Docker + Traefik · VPS OVH  
**Ambientes:** dev / staging / production  
**Data:** 2026-05-27  
**Classificação:** Confidencial © 2026 iCompliance.eu

---

## Índice de Severidade

| # | Área | Vulnerabilidade | Severidade | Ficheiro de Fix |
|---|------|-----------------|------------|-----------------|
| 1 | Docker | Containers a correr como root | 🔴 CRÍTICA | `docker/Dockerfile.*.secure` |
| 2 | NestJS | Sem rate limiting → brute force | 🔴 CRÍTICA | `nestjs/throttler.config.ts` |
| 3 | NestJS | JWT em localStorage (XSS steal) | 🔴 CRÍTICA | `nestjs/auth.config.ts` |
| 4 | Traefik | Sem security headers HTTP | 🔴 CRÍTICA | `traefik/middleware.yml` |
| 5 | Docker | Secrets em variáveis de ambiente em texto plano | 🔴 CRÍTICA | `docker/docker-compose.prod.yml` |
| 6 | NestJS | CORS permissivo (`*`) | 🟠 ALTA | `nestjs/cors.config.ts` |
| 7 | NestJS | Sem validação global de input | 🟠 ALTA | `nestjs/validation.pipe.ts` |
| 8 | NestJS | Stack traces expostos em produção | 🟠 ALTA | `nestjs/exception.filter.ts` |
| 9 | Next.js | Sem Content Security Policy | 🟠 ALTA | `nextjs/next.config.security.js` |
| 10 | Traefik | TLS 1.0/1.1 permitidos | 🟠 ALTA | `traefik/tls.yml` |
| 11 | Docker | Docker socket exposto | 🟠 ALTA | `docker/docker-compose.prod.yml` |
| 12 | NestJS | Passwords com bcrypt (migrar para Argon2) | 🟡 MÉDIA | `nestjs/crypto.service.ts` |
| 13 | NestJS | Sem audit logging | 🟡 MÉDIA | `nestjs/audit.interceptor.ts` |
| 14 | NestJS | Tokens JWT sem revogação | 🟡 MÉDIA | `nestjs/token-blacklist.service.ts` |
| 15 | Docker | Sem resource limits nos containers | 🟡 MÉDIA | `docker/docker-compose.prod.yml` |
| 16 | VPS | Sem fail2ban para SSH/HTTP | 🟡 MÉDIA | `scripts/fail2ban-setup.sh` |
| 17 | Next.js | Variáveis secretas acessíveis no cliente | 🟡 MÉDIA | `nextjs/env-audit.md` |
| 18 | Docker | .dockerignore incompleto | 🟢 BAIXA | `docker/.dockerignore` |
| 19 | Traefik | Dashboard exposto sem auth | 🟢 BAIXA | `traefik/traefik.yml` |

---

## Plano de Implementação (por ordem de prioridade)

### FASE 1 — Crítico (implementar hoje)
1. Aplicar `traefik/middleware.yml` → headers HTTP imediatos
2. Aplicar `traefik/tls.yml` → desativar TLS antigo
3. Ativar throttler no NestJS
4. Mover JWT para cookies HttpOnly
5. Containers com utilizador não-root

### FASE 2 — Alta (esta semana)
6. Validação global de input (ValidationPipe)
7. Exception filter sem stack traces
8. CORS restrito por ambiente
9. CSP no Next.js
10. Docker secrets para credenciais

### FASE 3 — Média (próximas 2 semanas)
11. Migrar para Argon2
12. Audit logging
13. Token blacklist/revogação
14. Resource limits Docker
15. Fail2ban no VPS

---

## Checklist de Validação Pós-Implementação

```bash
# Correr após cada fase:
bash scripts/security-check.sh https://app.icomply.pt
```

Ferramentas externas a usar (confirmar propriedade do domínio):
- https://securityheaders.com — headers HTTP
- https://www.ssllabs.com/ssltest/ — configuração TLS
- https://observatory.mozilla.org — auditoria completa
- https://pentest-tools.com — scan de vulnerabilidades
