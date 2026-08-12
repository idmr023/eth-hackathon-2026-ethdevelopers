# InvoiceShield 🛡️

**Protocolo descentralizado de coordinación financiera y prevención de fraude en factoring B2B para MYPES del Perú** — construido sobre **Arbitrum Sepolia** (RWA + DeFi + IA). Proyecto desarrollado para la **Hackathon ETH Lima 2026**.

El sistema mitiga las dos fricciones financieras más críticas en el factoring nacional:
1. **Fraude por doble financiación** — evita que una misma factura XML sea financiada en múltiples entidades simultáneamente mediante un registro inmutable on-chain (`keccak256`).
2. **Riesgo de oráculo y facturas fantasma** — protege el desembolso de fondos exigiendo la validación a través de adaptadores simulados de **SUNAT** y **CAVALI** (diseñados con interfaces listas para oráculos y APIs reales).

Además, incluye el contrato inteligente `BlindBidVault` para subastas de oferta sellada (*commit–reveal*) de deuda activa tokenizada.

---

## 🏗️ Estructura del Monorepo

```
ethackhaton-frontend&backend/
├── backend/            → API NestJS + Prisma + Neon PostgreSQL (Arbitrum Sepolia)
├── frontend/           → dApp Next.js (App Router) + Tailwind v4 + Wagmi/RainbowKit
├── contracts/          → Contratos inteligentes Solidity (Foundry) & BlindBidVault
├── docs/               → Arquitectura, changelog y documentación técnica
└── .github/            → CI/CD Workflows (lint, typecheck, tests)
```

---

## 🚀 Puesta en Marcha Rápida

Requisitos previos: **Node.js 22+**, **npm**, acceso a **Neon PostgreSQL** (o PostgreSQL local).

### 1. Backend (NestJS)
```bash
cd backend
npm install
cp .env.example .env        # Configurar DATABASE_URL y secretos JWT
npx prisma generate
npx prisma migrate dev      # Aplicar migraciones de base de datos
npm run db:seed             # Cargar usuarios, roles y facturas de prueba
npm run dev                 # Inicia en http://localhost:4000
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local  # Configurar NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                 # Inicia en http://localhost:3000
```

---

## 🧪 Pruebas y Calidad

- **Backend:** `npm test`, `npm run lint`, `npm run typecheck`
- **Frontend:** `npm test`, `npm run lint`, `npm run typecheck`
- **Contratos (Foundry):** `forge test` (dentro de `contracts/`)

---

## 🔐 Seguridad y Estándares

- **WORM Audit Logs:** Historial inmutable con políticas estrictas de base de datos.
- **Autoridad de Negocio Backend:** Lógica y validación robustas centralizadas en NestJS.
- **Seguridad Criptográfica:** Cálculo de hashes del lado del servidor basados en XML originales de SUNAT.


---

## 📄 Fases

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Fundación del repo y análisis | ✅ |
| 1 | Backend: esqueleto, seguridad, módulos core | ✅ |
| 2 | Backend: seed, 43 tests, gate verde | ✅ |
| 3 | Backend: CI y extensión del API | ✅ |
| 4 | Frontend: dApp + subastas BlindBid | ✅ |
| 5 | Documentación final | ✅ |
| 6 | Despliegue (Vercel + Render) | 🔜 |

Ver [`docs/CHANGELOG.md`](docs/CHANGELOG.md) para el detalle cronológico por fase y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para el diseño técnico completo.

---

## 🧭 Documentación

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — registro cronológico del trabajo por fase.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura, flujos, seguridad e invariantes.
- [`docs/Eth Hackathon.md`](docs/Eth%20Hackathon.md) — hoja de ruta de la hackathon.
- [`docs/Profesionalismo y buenas prácticas.md`](docs/Profesionalismo%20y%20buenas%20prácticas.md) — convenciones de calidad.
- [`AGENTS.md`](AGENTS.md) — especificación técnica para agentes de IA.
- [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md) — guías por aplicación.
