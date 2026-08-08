# InvoiceShield

**Protocolo descentralizado de coordinación financiera y prevención de fraude en factoring B2B para MYPES del Perú** — construido sobre **Arbitrum Sepolia** (RWA + DeFi + IA). Proyecto para la **Hackathon ETH Lima 2026**.

El sistema ataca dos fricciones críticas del factoring peruano:

1. **Fraude por doble financiación** — que una misma factura XML sea financiada en múltiples entidades. Se previene registrando una huella `keccak256` inmutable on-chain del activo.
2. **Riesgo de oráculo y facturas fantasma** — el desembolso solo se libera cuando adaptadores simulados de **SUNAT** y **CAVALI** (encapsulados tras una interfaz reemplazable por oráculos reales) dan luz verde.

Además incluye un módulo de **licitaciones BlindBid** (subastas de oferta sellada commit–reveal) para adjudicar la venta de deuda activa de forma transparente.

---

## 🏗️ Arquitectura

Monorepo con dos aplicaciones independientes:

```
ethackhaton-frontend&backend/
├── backend/    → API NestJS 11 + Prisma 6 + Neon PostgreSQL (Arbitrum Sepolia)
├── frontend/   → dApp Next.js 16 (App Router) + Tailwind v4 + wagmi/RainbowKit
├── docs/       → CHANGELOG, arquitectura, hoja de ruta
└── .github/    → CI (lint, typecheck, tests, build)
```

**Flujo de coordinación financiera (on-chain / off-chain):**

1. La MYPE sube la factura electrónica (XML de SUNAT).
2. El **backend** valida el XML, calcula la huella `keccak256(ruc_emisor + ruc_receptor + numero + monto)` y la registra on-chain → **inmutabilidad anti doble financiamiento**.
3. Un análisis de riesgo por **IA** (OpenRouter/Nemotron) detecta anomalías de negocio.
4. Un *Escrow* on-chain retiene los fondos en **USDC**.
5. Los **adaptadores SUNAT/CAVALI** (simulados) liberan el capital solo tras validar conformidad SUNAT y anotación en CAVALI/Factrack.
6. En impago, el contrato emite un **NFT de Deuda Activa** que puede subastarse vía el módulo **BlindBid**.

> ⚙️ El contrato inteligente `BlindBidVault` está desplegado en Arbitrum Sepolia; en este repo se integra vía ABI (`frontend/lib/web3/contracts/BlindBidVault.ts`) y a través de `backend/src/modules/bidding`.

---

## 🚀 Puesta en marcha (local)

Prerrequisitos: **Node.js 22+**, **npm**, acceso a una base **Neon PostgreSQL**.

### Backend

```bash
cd backend
npm install
cp .env.example .env        # completa DATABASE_URL, JWT_*_SECRET, etc.
npx prisma generate
npx prisma migrate deploy   # aplica migraciones (o npx prisma migrate dev)
npm run db:seed             # datos demo (admin, factores, facturas)
npm run start:dev           # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                 # http://localhost:3000
```

Accesos demo (seed): admin `admin@invoiceshield.dev` / `ChangeMe123!` · analistas `analista@continental.pe` y `analista@peru.pe`.

### Comandos útiles (raíz)

```bash
npm run dev:backend    # backend con recarga en vivo
npm run dev:frontend   # frontend Next.js
```

---

## 🧪 Calidad (gate obligatorio por fase)

| Comando (backend) | Comando (frontend) | Descripción |
|---|---|---|
| `npm run lint` | `npm run lint` | ESLint estricto, cero alertas |
| `npm run typecheck` | `npm run typecheck` | `tsc --noEmit`, tolerancia cero |
| `npm test` | `npm test` | Tests unitarios (vitest en front) |
| `npm run test:e2e` | — | Tests e2e (jest) |
| `npm run build` | `npm run build` | Compilación de producción |

Estado: **back 39 unit + 4 e2e · front 21 unit** — gate en verde en CI.

---

## 🔐 Seguridad y reglas de diseño

- **Cero hardcoding de secretos** — solo `.env.example` versionado.
- **Auditoría WORM** — `audit_logs` append-only por triggers y `REVOKE` (Write Once, Read Many).
- **Autoridad central en backend** — el frontend es solo visualizador; validación, roles y tasas viven en NestJS.
- **Hash del lado del servidor** — nunca se confía en hashes enviados por el cliente.
- **Aislamiento de oráculos** — adaptadores SUNAT/CAVALI tras la interfaz `AdapterService`.
- **Sesión con cookies httpOnly** — `is_session` (15m) + `is_refresh` (7d, rotatorio single-use), lockout tras 5 intentos.
- **Rate limiting** por endpoint (login 20/15min, refresh 60/15min, global 300/min) y RBAC con 7 permisos.

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
