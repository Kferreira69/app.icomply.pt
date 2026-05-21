# iComply MVP — Compliance Operating System

> **Owner:** Contemporary Constellation  
> **Version:** 1.0.0 — Phase 1 MVP  
> **Stack:** Next.js 14 + NestJS + PostgreSQL + MinIO  
> **Architecture:** Modular Monolith · API-First · Multi-Tenant

---

## Overview

iComply is a European SaaS Compliance Operating System that helps organizations manage ISO, GDPR, NIS2, RGPC and other compliance frameworks — replacing manual, Excel-based processes with an auditable, collaborative platform.

---

## Phase 1 Modules

| Module | Status |
|--------|--------|
| Auth (JWT + RBAC) | ✅ |
| Multi-Tenant Organizations | ✅ |
| Dashboard (KPIs + Compliance Score) | ✅ |
| Diagnostic Engine | ✅ |
| Projects & Tasks | ✅ |
| Risk Register | ✅ |
| Evidence Management | ✅ |
| Audits & Findings | ✅ |
| CAPA | ✅ |
| Basic Reporting (PDF/Excel) | ✅ |
| Excel Import | ✅ |
| Audit Log | ✅ |

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10 (TypeScript)
- **ORM:** Prisma 5
- **Database:** PostgreSQL 16
- **Auth:** JWT (Passport.js)
- **Storage:** S3-compatible (MinIO locally, AWS S3 in production)
- **Validation:** class-validator + class-transformer
- **API Docs:** Swagger (OpenAPI 3.0)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand + React Query (TanStack Query)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Tables:** TanStack Table

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### 1. Clone & setup env
```bash
git clone https://github.com/contemporary-constellation/icomply-mvp.git
cd icomply-mvp
cp .env.example .env
# Edit .env with your values
```

### 2. Start infrastructure
```bash
docker-compose up postgres minio redis -d
```

### 3. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:3000
```

---

## Project Structure

```
icomply-mvp/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # JWT, guards, RBAC
│   │   ├── organizations/    # Multi-tenant orgs
│   │   ├── users/            # User management
│   │   ├── frameworks/       # Compliance frameworks
│   │   ├── diagnostics/      # Diagnostic engine
│   │   ├── projects/         # Compliance projects
│   │   ├── tasks/            # Task management
│   │   ├── risks/            # Risk register
│   │   ├── evidence/         # Evidence management
│   │   ├── controls/         # Controls library
│   │   ├── audits/           # Audit management
│   │   ├── capa/             # Corrective actions
│   │   ├── reports/          # Reporting & export
│   │   ├── excel-import/     # Excel import engine
│   │   └── common/           # Shared utilities
│   └── prisma/               # DB schema + migrations + seed
├── frontend/                 # Next.js App
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # UI components
│       ├── hooks/            # React hooks
│       ├── lib/              # API client, utils
│       └── types/            # TypeScript types
├── docker-compose.yml
└── .env.example
```

---

## RBAC Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform admin (Contemporary Constellation) |
| `ADMIN` | Organization administrator |
| `COMPLIANCE_MANAGER` | Full access within organization |
| `CONSULTANT` | Can manage assigned projects |
| `VIEWER` | Read-only access |

---

## Roadmap

| Phase | Focus | Target |
|-------|-------|--------|
| **Phase 1 — MVP** | Core modules (current) | Q3 2026 |
| **Phase 2 — Scale** | AI recommendations, integrations (M365, ERP) | Q1 2027 |
| **Phase 3 — Enterprise** | SOC2, mobile, marketplace | Q3 2027 |

---

## License & Ownership

All code, architecture, data models, and documentation are the exclusive intellectual property of **Contemporary Constellation**.  
No third-party vendor or contractor may claim ownership of any deliverables.
