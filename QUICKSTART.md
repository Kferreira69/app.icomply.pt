# iComply MVP — Quick Start Guide

## Prerequisites
- Node.js 20+
- Docker Desktop (running)
- npm or yarn

---

## 1. Start Infrastructure (PostgreSQL + MinIO + Redis)

```bash
docker-compose up -d postgres minio redis
```

Wait ~10 seconds for services to initialize.

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed demo data (frameworks, questions, demo org + users)
npm run db:seed

# Start development server
npm run start:dev
```

Backend runs at: **http://localhost:3001**  
Swagger API docs: **http://localhost:3001/api/docs**

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 4. Demo Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.icomply.pt | Admin@123456 |
| Compliance Manager | compliance@demo.icomply.pt | Admin@123456 |

---

## 5. MinIO (Object Storage)

Console: **http://localhost:9001**  
Username: `minioadmin`  
Password: `minioadmin_secret`

Create bucket `icomply-evidence` if it doesn't exist on first login.

---

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Reset database (deletes all data)
cd backend && npm run db:reset

# Open Prisma Studio (DB browser)
cd backend && npm run db:studio

# Type check frontend
cd frontend && npm run type-check
```

---

## Architecture Overview

```
iComply MVP
├── frontend/          Next.js 14 (App Router) · shadcn/ui · Tailwind
├── backend/           NestJS 10 · Prisma 5 · PostgreSQL 16
├── prisma/            Database schema + migrations + seed
├── docker-compose.yml Infrastructure (postgres, minio, redis)
└── .env              Environment variables (gitignored)
```

## Phase 1 Features

- ✅ Multi-tenant authentication (JWT + Refresh tokens)
- ✅ RBAC (Super Admin → Admin → Compliance Manager → Consultant → Viewer)
- ✅ Compliance Dashboard with KPIs
- ✅ Diagnostic Engine (rule-based framework recommendations)
- ✅ Projects & Task Management
- ✅ Risk Register with 5×5 Heatmap
- ✅ Evidence Management (S3/MinIO upload)
- ✅ Audit Management with Findings
- ✅ CAPA (Corrective Action & Preventive Action)
- ✅ Reports (Excel + compliance summaries)
- ✅ Excel Import (bulk tasks & risks)
- ✅ Audit Trail (all mutations logged)
- ✅ Frameworks: ISO 27001:2022, GDPR, NIS2, RGPC, ISO 9001, **DORA**, **EU Pay Transparency**

---

## 6. VPS Deployment (Production)

iComply can run on the same VPS as `ai.contemporaryconstellation.pt` **without interference** — each project runs in its own Docker network and communicates through a shared Traefik reverse proxy.

### Architecture

```
VPS
├── traefik (shared, port 80 + 443)
│   └── network: traefik-public
│
├── ai.contemporaryconstellation.pt  (existing project)
│   └── network: ai-internal  ←→  traefik-public
│
└── iComply
    ├── network: icomply-internal  (postgres, redis, minio — NEVER exposed)
    └── network: traefik-public   (backend + frontend — routed by Traefik)
```

**Isolation guarantees:**
- Databases are on isolated bridge networks — no cross-project access
- No host port conflicts (nothing binds to host ports except Traefik on 80/443)
- Each project has independent volumes with prefixed names (`icomply_*`)
- Traefik routes by domain name — wrong domain = wrong container, no leakage

### Step-by-step VPS Setup

**Once (first time, shared infrastructure):**

```bash
# 1. Create the shared Traefik network
docker network create traefik-public

# 2. Deploy Traefik (shared reverse proxy)
# Edit traefik/docker-compose.traefik.yml — set TRAEFIK_ACME_EMAIL
docker-compose -f traefik/docker-compose.traefik.yml up -d

# 3. Point your DNS records to the VPS IP:
#    A  app.icomply.pt       → VPS_IP
#    A  api.app.icomply.pt   → VPS_IP
```

**iComply deployment:**

```bash
# 4. Clone/copy the project to the VPS
git clone https://github.com/contemporaryconstellation/icomply-mvp.git /opt/icomply

# 5. Create production env
cp .env.production.example .env.production
nano .env.production      # Fill in DB_PASSWORD, JWT_SECRET, MINIO_PASSWORD, SMTP etc.

# 6. Build images (or pull from registry)
docker-compose -f docker-compose.vps.yml --env-file .env.production build

# 7. Start services
docker-compose -f docker-compose.vps.yml --env-file .env.production up -d

# 8. Run migrations and seed
docker exec icomply_backend npx prisma migrate deploy
docker exec icomply_backend npm run db:seed
```

**Connecting existing `ai.contemporaryconstellation.pt` to the shared Traefik:**

If the AI automation project still binds directly to ports 80/443, migrate it to Traefik labels:
1. Remove `ports: - "80:80"` from its docker-compose
2. Add it to `traefik-public` network
3. Add Traefik labels (see `docker-compose.vps.yml` for label patterns)
4. Restart: `docker-compose up -d`

### Useful VPS Commands

```bash
# View iComply logs
docker-compose -f docker-compose.vps.yml --env-file .env.production logs -f

# Update to new version
docker-compose -f docker-compose.vps.yml --env-file .env.production pull
docker-compose -f docker-compose.vps.yml --env-file .env.production up -d

# Database backup
docker exec icomply_postgres pg_dump -U icomply icomply_db > backup_$(date +%Y%m%d).sql

# View all running projects (confirm isolation)
docker ps --format "table {{.Names}}\t{{.Networks}}\t{{.Ports}}"
```
