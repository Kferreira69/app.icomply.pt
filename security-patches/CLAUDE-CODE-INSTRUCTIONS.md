# INSTRUÇÕES PARA O CLAUDE CODE — iComply.pt Security Hardening
# Implementar por esta ordem exata

## FASE 1 — TRAEFIK (infraestrutura, sem alterar código)

### 1.1 Substituir configuração do Traefik
```bash
cp traefik/traefik.yml /caminho/para/traefik/traefik.yml
cp traefik/middleware.yml /caminho/para/traefik/config/middleware.yml
cp traefik/tls.yml /caminho/para/traefik/config/tls.yml
docker compose restart traefik
```

### 1.2 Validar headers imediatamente
```bash
curl -sI https://app.icomply.pt | grep -E "strict-transport|content-security|x-frame|x-content-type"
```

---

## FASE 2 — NESTJS BACKEND

### 2.1 Instalar dependências em falta
```bash
cd backend
npm install helmet cookie-parser argon2 ioredis @nestjs-modules/ioredis
npm install @nestjs/throttler
npm install -D @types/cookie-parser
```

### 2.2 Ficheiros a criar/substituir
- `src/main.ts` → substituir pelo ficheiro `nestjs/main.ts`
- `src/common/filters/http-exception.filter.ts` → novo ficheiro
- `src/common/interceptors/audit.interceptor.ts` → novo ficheiro
- `src/auth/auth.service.ts` → atualizar com lógica de cookies + Argon2
- `src/auth/token-blacklist.service.ts` → novo ficheiro
- `src/auth/jwt.strategy.ts` → atualizar para ler JWT de cookie

### 2.3 Atualizar AppModule
```typescript
// app.module.ts — adicionar:
imports: [
  ThrottlerModule.forRootAsync({...}),  // ver nestjs/throttler.config.ts
  IoRedisModule.forRoot({ config: { url: process.env.REDIS_URL } }),
  // ...resto dos módulos
]
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  // ...
]
```

### 2.4 Atualizar AuthController
```typescript
// Adicionar decoradores @Throttle em login, register, forgot-password
// Ver nestjs/throttler.config.ts para os valores exatos
```

---

## FASE 3 — NEXT.JS FRONTEND

### 3.1 Substituir next.config.js
```bash
cp nextjs/next.config.security.js next.config.js
```

### 3.2 Verificar variáveis de ambiente
- Auditar todos os `process.env.*` no código cliente
- Remover qualquer secret que tenha `NEXT_PUBLIC_` por engano
- Ver `nextjs/env-guide.md` para referência

### 3.3 Remover tokens do localStorage/sessionStorage
```bash
# Pesquisar no código frontend:
grep -r "localStorage.*token\|sessionStorage.*token" src/
# Substituir por cookies HttpOnly geridos pelo backend
```

---

## FASE 4 — DOCKER PRODUCTION

### 4.1 Substituir Dockerfiles
```bash
cp docker/Dockerfile.backend backend/Dockerfile
cp docker/Dockerfile.frontend frontend/Dockerfile
```

### 4.2 Configurar Docker Secrets
```bash
bash scripts/setup-secrets.sh
```

### 4.3 Substituir docker-compose.prod.yml
```bash
cp docker/docker-compose.prod.yml docker-compose.prod.yml
# Revisar e ajustar nomes de imagens/volumes ao projeto
```

---

## FASE 5 — VALIDAÇÃO FINAL

```bash
# Correr o script de validação
bash scripts/security-check.sh https://app.icomply.pt https://api.icomply.pt

# Ferramentas externas (gratuitas):
# 1. https://securityheaders.com/?q=app.icomply.pt → deve dar A+
# 2. https://www.ssllabs.com/ssltest/analyze.html?d=app.icomply.pt → deve dar A
# 3. https://observatory.mozilla.org/analyze/app.icomply.pt → deve dar A+
```

---

## NOTAS PARA O CLAUDE CODE

1. **Não alterar** a lógica de negócio existente — apenas adicionar camadas de segurança
2. **Testar** em staging antes de aplicar em produção
3. **Migração de passwords**: se já existem users com bcrypt, manter suporte dual durante a migração
   ```typescript
   // Detetar o tipo de hash e migrar progressivamente
   async verifyAndMigrate(user, password) {
     if (user.passwordHash.startsWith('$2')) {  // bcrypt
       const valid = await bcrypt.compare(password, user.passwordHash);
       if (valid) {
         // Migrar para Argon2 no próximo login
         user.passwordHash = await argon2.hash(password, {...});
         await this.users.save(user);
       }
       return valid;
     }
     return argon2.verify(user.passwordHash, password);
   }
   ```
4. **Ambientes**: as configurações de CORS, rate limiting e cookie `secure` flag já estão condicionadas por `NODE_ENV`
5. **Redis**: necessário em produção para throttler partilhado e token blacklist — adicionar ao docker-compose se não existir
