# LicitaBien

**Plataforma descentralizada de licitaciones públicas y factoring B2B blindada con IA y pruebas de conocimiento cero on-chain** — construida sobre **Arbitrum Sepolia** (RWA + DeFi + IA). Proyecto desarrollado para la **Hackathon ETH Lima 2026**.

LicitaBien moderniza y asegura los procesos de licitación y adjudicación de contratos/facturas para MYPES y entidades públicas:
1. **Licitaciones transparentes con Commit–Reveal** — evita filtraciones de ofertas y colusiones mediante ofertas selladas on-chain gestionadas a través del contrato `BlindBidVault`.
2. **Evaluación inteligente con IA (OpenRouter / Llama 3.1 Nemotron)** — análisis automatizado de propuestas y cálculo de puntuaciones de calidad (`aiScore`).
3. **Credenciales Verificables con EAS** — emisión de atestaciones on-chain de reputación y adjudicación mediante Ethereum Attestation Service.

---

## 🏗️ Estructura del Monorepo

```
ethackhaton-frontend&backend/
├── backend/            → API NestJS + Prisma + Neon PostgreSQL (Arbitrum Sepolia)
├── frontend/           → dApp Next.js (App Router) + Tailwind v4 + Wagmi/RainbowKit (Módulo LicitaBien)
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
npm run db:seed             # Cargar usuarios, roles y datos demo de LicitaBien
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
- **Seguridad Criptográfica:** Commit–Reveal on-chain y cálculo de hashes del lado del servidor.



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
