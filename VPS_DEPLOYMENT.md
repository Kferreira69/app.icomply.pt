# iComply — Guia de Deployment em VPS Dedicado

> VPS dedicado exclusivamente ao iComply.  
> Sistema operativo recomendado: **Ubuntu 22.04 LTS**

---

## 1. Subdomínios a criar no DNS

Cria os seguintes registos **A** no painel DNS do teu domínio (Cloudflare, Namecheap, etc.) apontando para o IP do VPS:

### Produção (utilizadores finais)
| Subdomínio | Destino | Descrição |
|---|---|---|
| `app.icomply.pt` | `IP_DO_VPS` | Frontend — aplicação web |
| `api.icomply.pt` | `IP_DO_VPS` | Backend — API REST |

### Staging (testes antes de produção)
| Subdomínio | Destino | Descrição |
|---|---|---|
| `staging.icomply.pt` | `IP_DO_VPS` | Frontend staging |
| `api.staging.icomply.pt` | `IP_DO_VPS` | Backend staging |

### Desenvolvimento/CI (opcional, acesso interno)
| Subdomínio | Destino | Descrição |
|---|---|---|
| `dev.icomply.pt` | `IP_DO_VPS` | Frontend dev (com Swagger activo) |
| `api.dev.icomply.pt` | `IP_DO_VPS` | Backend dev |

### Ops/Infraestrutura (restringir por IP — não público)
| Subdomínio | Destino | Descrição |
|---|---|---|
| `traefik.icomply.pt` | `IP_DO_VPS` | Dashboard Traefik (protegido) |
| `files.icomply.pt` | `IP_DO_VPS` | MinIO console (gestão de ficheiros) |
| `db.icomply.pt` | `IP_DO_VPS` | Adminer — interface BD (opcional) |

> **TTL recomendado:** 300s durante setup, 3600s depois de estável.  
> **Cloudflare:** deixa Proxy OFF (nuvem cinzenta) durante o primeiro setup — o Let's Encrypt precisa de validar directamente.

---

## 2. Pré-requisitos no VPS

```bash
# Actualizar o sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER   # substituir pelo teu utilizador
newgrp docker

# Instalar Docker Compose v2
apt install -y docker-compose-plugin
docker compose version     # confirma v2.x

# Instalar Git
apt install -y git

# Instalar make (opcional, para atalhos)
apt install -y make
```

---

## 3. Estrutura de directorias no VPS

```
/opt/
├── traefik/                # Shared reverse proxy (único, partilhado)
│   ├── docker-compose.traefik.yml
│   ├── acme.json           # Certificados Let's Encrypt (chmod 600)
│   └── .env
│
└── icomply/
    ├── production/         # Ambiente produção
    │   ├── docker-compose.vps.yml
    │   └── .env.production
    │
    └── staging/            # Ambiente staging
        ├── docker-compose.vps.yml
        └── .env.staging
```

---

## 4. Setup inicial — passo a passo

### 4.1 Rede partilhada Traefik

```bash
# Criar a rede Docker partilhada entre todos os projectos
docker network create traefik-public
```

### 4.2 Deploy do Traefik

```bash
mkdir -p /opt/traefik
cd /opt/traefik

# Copiar o ficheiro de configuração do projecto
# (já incluído em traefik/docker-compose.traefik.yml)
cp /opt/icomply/production/traefik/docker-compose.traefik.yml .

# Criar ficheiro de certificados (OBRIGATÓRIO: permissões 600)
touch acme.json
chmod 600 acme.json

# Configurar email Let's Encrypt
cat > .env << 'EOF'
TRAEFIK_ACME_EMAIL=ops@contemporaryconstellation.pt
EOF

# Iniciar Traefik
docker compose -f docker-compose.traefik.yml --env-file .env up -d

# Confirmar que está a correr
docker ps | grep traefik
```

### 4.3 Deploy do iComply — Produção

```bash
mkdir -p /opt/icomply/production
cd /opt/icomply/production

# Clonar o repositório
git clone https://github.com/contemporaryconstellation/icomply-mvp.git .

# Criar ficheiro de variáveis de ambiente
cp .env.production.example .env.production
nano .env.production
# → Preencher: DB_PASSWORD, REDIS_PASSWORD, MINIO_USER, MINIO_PASSWORD,
#              JWT_SECRET, JWT_REFRESH_SECRET, DOMAIN, SMTP_*
```

**Gerar segredos seguros:**
```bash
# JWT_SECRET (copiar para .env.production)
openssl rand -base64 64

# JWT_REFRESH_SECRET (diferente do anterior)
openssl rand -base64 64

# DB_PASSWORD
openssl rand -base64 32

# REDIS_PASSWORD
openssl rand -base64 32

# MINIO_PASSWORD
openssl rand -base64 32
```

**Build e start:**
```bash
cd /opt/icomply/production

# Build das imagens (primeira vez demora ~5 min)
docker compose -f docker-compose.vps.yml --env-file .env.production build

# Iniciar tudo
docker compose -f docker-compose.vps.yml --env-file .env.production up -d

# Verificar logs (migrations correm automaticamente no arranque)
docker logs icomply_backend --follow

# Seed de dados iniciais (só na primeira vez)
docker exec icomply_backend npm run db:seed
```

**Confirmar que está tudo OK:**
```bash
# Serviços a correr
docker compose -f docker-compose.vps.yml ps

# Testar API
curl https://api.icomply.pt/api/v1/health

# Testar frontend
curl -I https://app.icomply.pt
```

### 4.4 Deploy do ambiente Staging

```bash
mkdir -p /opt/icomply/staging
cd /opt/icomply/staging

# Clonar (ramo staging ou main)
git clone -b develop https://github.com/contemporaryconstellation/icomply-mvp.git .

# Copiar e adaptar o .env
cp .env.production.example .env.staging
nano .env.staging
# → DOMAIN=staging.icomply.pt
# → Passwords diferentes das de produção
# → ENABLE_SWAGGER=true (útil para testes)

# Build e start
docker compose -f docker-compose.vps.yml --env-file .env.staging up -d
```

---

## 5. Actualizações (deploy contínuo)

```bash
cd /opt/icomply/production

# Pull do código mais recente
git pull origin main

# Rebuild e restart (downtime mínimo — Traefik faz health checks)
docker compose -f docker-compose.vps.yml --env-file .env.production build backend frontend
docker compose -f docker-compose.vps.yml --env-file .env.production up -d --no-deps backend frontend

# Migrations correm automaticamente no restart do backend
# Ver logs para confirmar
docker logs icomply_backend --tail 50
```

---

## 6. Backup automático da base de dados

```bash
# Criar script de backup
cat > /opt/icomply/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/opt/icomply/backups
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump PostgreSQL
docker exec icomply_postgres pg_dump -U icomply icomply_db | gzip > $BACKUP_DIR/icomply_$DATE.sql.gz

# Manter apenas os últimos 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup concluído: icomply_$DATE.sql.gz"
EOF
chmod +x /opt/icomply/backup.sh

# Agendar via cron (todos os dias às 3h00)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/icomply/backup.sh >> /opt/icomply/backup.log 2>&1") | crontab -
```

---

## 7. Monitorização (recomendado)

Instalar Uptime Kuma para monitorizar os endpoints:

```bash
mkdir -p /opt/uptime-kuma
cat > /opt/uptime-kuma/docker-compose.yml << 'EOF'
version: '3.9'
networks:
  traefik-public:
    external: true
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime_kuma
    restart: unless-stopped
    networks:
      - traefik-public
    volumes:
      - uptime_kuma_data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-public"
      - "traefik.http.routers.uptime.rule=Host(`status.icomply.pt`)"
      - "traefik.http.routers.uptime.entrypoints=websecure"
      - "traefik.http.routers.uptime.tls.certresolver=letsencrypt"
      - "traefik.http.services.uptime.loadbalancer.server.port=3001"
volumes:
  uptime_kuma_data:
EOF

docker compose -f /opt/uptime-kuma/docker-compose.yml up -d
```

Acede em `https://status.icomply.pt` e configura monitors para:
- `https://app.icomply.pt` (HTTP 200)
- `https://api.icomply.pt/api/v1/health` (HTTP 200)
- `https://staging.icomply.pt` (HTTP 200)

---

## 8. Sumário de subdomínios e quando criar

| Subdomínio | Criar quando | Prioridade |
|---|---|---|
| `app.icomply.pt` | Antes do primeiro deploy produção | 🔴 Obrigatório |
| `api.icomply.pt` | Antes do primeiro deploy produção | 🔴 Obrigatório |
| `staging.icomply.pt` | Antes de testar staging | 🟠 Recomendado |
| `api.staging.icomply.pt` | Antes de testar staging | 🟠 Recomendado |
| `files.icomply.pt` | Quando precisares de aceder ao MinIO | 🟡 Opcional |
| `traefik.icomply.pt` | Para monitorizar o proxy | 🟡 Opcional |
| `status.icomply.pt` | Ao instalar Uptime Kuma | 🟡 Opcional |
| `dev.icomply.pt` | Se quiseres CI/CD com preview deploys | ⚪ Futuro |
| `api.dev.icomply.pt` | Idem | ⚪ Futuro |
| `db.icomply.pt` | Gestão de BD (nunca em produção) | ⚪ Dev only |

---

## 9. Checklist pré-go-live

```
□ VPS provisionado (min. 2 vCPU, 4 GB RAM, 40 GB SSD)
□ Docker + Docker Compose v2 instalados
□ Registos DNS criados (app., api., staging., api.staging.)
□ Rede traefik-public criada
□ Traefik a correr com acme.json (chmod 600)
□ .env.production preenchido com passwords seguras
□ JWT_SECRET gerado com openssl (≥64 chars)
□ DB_PASSWORD, REDIS_PASSWORD, MINIO_PASSWORD gerados
□ Build das imagens sem erros
□ Migrations aplicadas (ver logs do backend)
□ Seed executado (admin@demo.icomply.pt funciona)
□ HTTPS funciona em app.icomply.pt e api.icomply.pt
□ Health check: GET https://api.icomply.pt/api/v1/health → 200
□ Login funciona na aplicação
□ Backup automático configurado (cron)
□ Uptime Kuma (ou similar) a monitorizar os endpoints
□ Password do admin alterada após primeiro login
```
