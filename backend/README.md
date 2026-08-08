# InvoiceShield · Backend

API de **NestJS 11 + Prisma 6 + Neon PostgreSQL** del protocolo InvoiceShield. Autoridad central de validación de negocio, RBAC, cálculo de hashes y orquestación blockchain sobre **Arbitrum Sepolia**.

---

## Stack

- **NestJS 11** (TypeScript estricto, modular por dominios)
- **Prisma 6** → **Neon PostgreSQL** (`directUrl` para migraciones, conexión pooled para la app)
- **ethers.js/viem** para interacción con `BlindBidVault` (Arbitrum Sepolia)
- **Swagger** (`@nestjs/swagger`) con DTOs validados por `class-validator`

## Estructura

```
src/
├── main.ts                     # bootstrap, /api, helmet, CORS, rate-limit, ValidationPipe
├── common/                     # errors.ts, permissions.ts (RBAC), guards, interceptors, filtros, DTOs
├── shared/                     # prisma.service, audit.service, crypto.service (keccak256),
│                               # resilience.service, config.ts (validateEnv), invoice-hash.ts
└── modules/
    ├── auth/                   # login, refresh, logout, change-password, me (cookies httpOnly)
    ├── users/ · factors/       # gestión de usuarios y factores (admin)
    ├── invoices/               # registro + huella keccak256 + validaciones SUNAT/CAVALI + fraud-alerts
    ├── adapters/               # adaptadores simulados SUNAT y CAVALI (interfaz InvoiceAdapter)
    ├── anomalies/              # anomalías detectadas por IA
    ├── audit/                  # log WORM append-only
    ├── dashboard/              # KPIs y recientes filtrados por permisos
    ├── bidding/                # subastas BlindBid (commit-reveal) y delegación de revelación
    └── blockchain/             # ArbitrumService (signer, lectura/escritura del vault)
```

## API (prefijo `/api`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/change-password` | Sesión con cookies |
| GET | `/auth/me` | Sesión actual |
| GET/POST | `/invoices` · `/invoices/register` · `/invoices/fraud-alerts` · `/invoices/:id` | Facturas y alertas |
| POST | `/adapters/sunat/conformity` · `/adapters/cavali/factrack` · GET `/adapters/status` | Firmas de conformidad y estado |
| GET/POST | `/factors` · `/users` · `/users/:id/status` | Administración |
| POST | `/anomalies` | Registro de anomalías |
| GET | `/audit` | Log WORM filtrable |
| GET | `/dashboard` | KPIs condicionados por permisos |
| POST/GET | `/auctions` · `/auctions/:id` | Crear y listar licitaciones |
| GET | `/auctions/:id/bidders` · `/auctions/:id/commitment/:bidder` | Estado on-chain de ofertas |
| POST | `/auctions/:id/delegate-reveal` · `/auctions/:id/audit-score` | Delegación al agente y scoring IA |
| GET | `/health` | Health check |

Formato de respuesta estándar: `{ ok: boolean, data: any, total?: number }`.

## Variables de entorno (`.env`)

Ver [`backend/.env.example`](.env.example). Claves principales:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Conexión Neon (pooled / directa) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥ 32 caracteres |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` |
| `ALLOWED_ORIGINS` | Orígenes CORS separados por coma |
| `ARBITRUM_RPC_URL` · `ARBITRUM_PRIVATE_KEY` · `ARBITRUM_CHAIN_ID` | Node y signer del vault |
| `BLIND_BID_VAULT_ADDRESS` | Dirección del contrato BlindBidVault |
| `AGENT_ENCRYPTION_KEY` | Clave AES-256-GCM (hex 64) para cifrar reveal secrets delegados |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credenciales del seed (solo pre-producción) |

## Comandos

```bash
npm run start:dev        # desarrollo con recarga
npm run build            # nest build → dist/main.js
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm test                 # tests unitarios (jest)
npm run test:e2e         # tests e2e (jest --config test/jest-e2e.json)
npx prisma migrate dev   # nueva migración
npx prisma migrate deploy# aplicar en producción (Neon)
npm run db:seed          # datos demo (tsx prisma/seed.ts)
```

## Seguridad

- **WORM** en `audit_logs` vía triggers y `REVOKE` (append-only).
- **Cookies httpOnly** con refresh rotatorio single-use y lockout tras 5 intentos.
- **Rate limiting** (login 20/15min, refresh 60/15min, global 300/min).
- **RBAC**: 7 permisos y guards con super-gate para admins.
- **Hash keccak256 siempre del lado del servidor** (`shared/invoice-hash.ts`).
- **Cifrado AES-256-GCM** de los secrets de revelación delegados al agente.

## Tests

- 39 unitarios: auth (lockout, rotación, cambio de contraseña), invoices (doble financiamiento, transiciones), adapters, resilience (retry + circuit breaker), RBAC, keccak256.
- 4 e2e: identidad del API, health, 401 sin sesión, validación de body.
