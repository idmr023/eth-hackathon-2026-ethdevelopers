# Changelog — InvoiceShield

Registro cronológico de trabajo por fases. Formato: `[fase.x] descripción`.

## [fase.0] — Fundación del repositorio (completado)

- [fase.0] `git init`, `.gitignore` raíz, `AGENTS.md` con reglas del proyecto.
- [fase.0] Análisis de 9 proyectos de referencia (ripnel-platform, sharol-tienda, gestionalo, ollas-comunes, proyecto_SAAS, app-estudio-juridico, cineplanet, dentista, portafolio) para replicar arquitectura, seguridad y estilo.
- [fase.0] Decisión de stack: Next.js App Router (frontend) + NestJS 11 + Prisma 6 + Neon (backend). Smart contract fuera de alcance.
- [fase.0] `backend/.env.example` y `frontend/.env.example` versionados (nunca `.env`).

## [fase.1] — Backend: esqueleto y seguridad (completado)

- [fase.1] Scaffold NestJS 11 con TypeScript estricto; scripts `typecheck`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `db:seed`.
- [fase.1] Prisma schema completo: `User, Session, Factor, Invoice, Validation, Anomaly, FraudAlert, AuditLog` + enums; migraciones `20260804000000_init` y `20260804000001_audit_worm`.
- [fase.1] WORM: `audit_logs` append-only vía triggers + REVOKE en migración (regla 2 de AGENTS.md).
- [fase.1] `common/`: catálogo `errors.ts`, RBAC `permissions.ts` (7 permisos), `dto/pagination.dto.ts`, guards (auth + permisos con super-gate), filter global, interceptors (transform envelope `{ ok, data, total? }` y logging).
- [fase.1] `shared/`: `prisma.service`, `audit.service` (usa `set_config('app.actor_user_id')`), `crypto.service` (Keccak256 server-side), `resilience.service` (retry + circuit breaker), `config.ts` (validateEnv estricto), `invoice-hash.ts` (función pura del hash del protocolo).
- [fase.1] `main.ts`: prefijo `/api`, helmet CSP, CORS con credenciales, rate-limit (login 20/15min, refresh 60/15min, global 300/min), ValidationPipe estricto, PORT 4000.
- [fase.1] Autenticación con cookies httpOnly: `is_session` (15m) + `is_refresh` (7d rotatorio single-use, hash SHA-256 en `sessions`, jti = sessionId); lockout tras 5 intentos en 15 min.
- [fase.1] Módulos: auth, users, factors, invoices (hash + detección de doble financiamiento → `FraudAlert` + `FRAUD_DETECTED` 409, validación SUNAT+CAVALI → VALIDATED, anomalía → BLOCKED), adapters (SUNAT/CAVALI simulados tras interfaz `InvoiceAdapter`), anomalies, dashboard, audit, health.
- [fase.1] Calidad: lint sin errores, `tsc --noEmit` limpio, `nest build` OK.

## [fase.2] — Backend: pruebas y datos demo (completado)

- [fase.2] `prisma/seed.ts`: admin, 2 factores, 2 analistas y facturas demo (PENDING/VALIDATED/BLOCKED) con hashes reales + alerta de fraude demo.
- [fase.2] 39 tests unitarios (auth: lockout, rotación de refresh, cambio de contraseña; invoices: doble financiamiento, transiciones; adapters; resilience: retry + circuit breaker; RBAC; keccak256).
- [fase.2] 4 tests e2e (identidad del API, health, 401 sin sesión, validación de body) con `PrismaService` mockeado y `setupFiles` de entorno.
- [fase.2] Gate completo verde: `lint` + `typecheck` + `test` + `test:e2e` + `build`.

## [fase.3] — Backend: CI y entrega (completado)

- [fase.3] GitHub Actions: workflow de CI con jobs de lint/typecheck/tests/build (job frontend comentado hasta fase.4).
- [fase.3] Extensión del API: `GET /api/invoices/fraud-alerts` (paginado) y dashboard con `recentAudit`/`recentUsers` filtrados server-side por permisos del solicitante.

## [fase.4] — Frontend (completado)

- [fase.4] Scaffold Next.js 16.3.0 (App Router, Tailwind v4, React 19) con theme cyberpunk-neón sobrio y animaciones centralizadas en `lib/animations.ts`.
- [fase.4] Capa API: `lib/api.ts` (`apiFetch` con cookies y envelope `{ ok, data, total? }`), `lib/auth.ts`, `lib/endpoints.ts` (clientes tipados por dominio), `lib/types.ts` espejo del backend, `lib/permissions.ts` (helpers RBAC de UI), `lib/format.ts` (moneda PEN/USD, fechas es-PE, hashes cortos).
- [fase.4] Sesión: `IsAuthProvider` (bootstrap vía `/api/auth/me`, estados loading/authenticated/unauthenticated) + gates client-side en raíz, `/login` y layout del grupo `(app)`.
- [fase.4] UI kit: `button`, `card`, `input`, `badge`, `table` (DataTable con paginación), `AppShell` con sidebar filtrada por permisos.
- [fase.4] Páginas: login, dashboard (KPIs + recientes condicionados a permisos), facturas (lista con filtros, registro, detalle con firma SUNAT/CAVALI), alertas de fraude, adaptadores, auditoría (filtros WORM), admin de usuarios y factores.
- [fase.4] Hook `useAsyncResource` (patrón cancel-safe, sin `setState` síncrono en efectos — regla `react-hooks/set-state-in-effect` de React 19).
- [fase.4] Calidad: 21 tests vitest (format, permissions, api), lint sin errores, `tsc --noEmit` limpio, `next build` OK con todas las rutas.

## [fase.4.blindbid] — Frontend: subastas BlindBid (completado)

- [fase.4.blindbid] Tipos de subasta en `lib/types.ts`: `Auction`, `AuctionResponse`, `OnChainCommitment`, `Delegation`, `AuditVerdict`, enums `AuctionStatus`/`DelegationStatus`.
- [fase.4.blindbid] `lib/endpoints.ts`: `auctionsApi` tipado (list, detail, bidders, commitment, create, delegateReveal, setAuditScore).
- [fase.4.blindbid] Lista de licitaciones `/auctions` con paginación desde el backend sincronizado on-chain; `export default` de página corregido.
- [fase.4.blindbid] Alta de licitación `/auctions/new` (valida ventanas commit/reveal; hook de permisos movido tras los hooks de React — regla `react-hooks/rules-of-hooks`).
- [fase.4.blindbid] Detalle de licitación `/auctions/[id]`: commit-reveal nativo (commitment `keccak256(encodePacked(uint256,string))` vía viem), reveal, delegación de revelación al agente, reembolso de stake y liquidación por el organizador; panel de ofertantes y estado on-chain del postor.
- [fase.4.blindbid] Web3: `useBlindBidVault.ts` (hooks read/write con casts `0x${string}`, eliminado hook de evento inválido), `addresses.ts` tipado, `Web3Provider.tsx` sin dependencia `next-themes` y sin prop `chains` (RainbowKit 2.x), `WalletButton.tsx` con props válidas de `ConnectButton`.
- [fase.4.blindbid] Calidad: `tsconfig.json` target ES2020 (BigInt), lint sin errores, `tsc --noEmit` limpio, 21 tests vitest en verde, `next build` OK.

## [fase.5] — Documentación final (completado)

- [fase.5] `README.md` raíz reescrito: visión, arquitectura, flujo de coordinación, quickstart, comandos de calidad, seguridad, tabla de fases e índice de documentación.
- [fase.5] `backend/README.md` reescrito: stack, estructura por dominios, tabla de API `/api`, variables de entorno, comandos, seguridad y cobertura de tests.
- [fase.5] `frontend/README.md` reescrito: stack, estructura, rutas, capa web3/BlindBidVault (fórmula del commitment), env y comandos.
- [fase.5] `docs/README.md` (índice de documentación) y `docs/ARCHITECTURE.md` (flujos mermaid, mecánica commit–reveal, invariantes, modelo de datos, seguridad y despliegue).
- [fase.5] CI: habilitado el job `frontend` (lint, typecheck, tests, build) en `.github/workflows/ci.yml` — ya no está comentado tras fase.4.
- [fase.5] Limpieza: `frontend/.env.example` sin la línea huérfana `ALLOWED_ORIGINS` (variable del backend) y con vars web3 documentadas.
- [fase.5] Limpieza: eliminado `backend/check_tables.ts` (script de depuración de Neon en la raíz que rompía `nest build` por `rootDir: src`).

## [fase.6] — Despliegue (en preparación)

- [fase.6] Arquitectura elegida: **frontend → Vercel** (proyecto Next.js standalone) y **backend → Render** (Web Service NestJS, `node dist/main.js`); DB permanece en Neon.
- [fase.6] Cookies de sesión cross-origin: `sameSite` pasa a `'none'` en producción (`secure: true`, HTTPS) en `auth.controller.ts`; en local `'lax'`. Requerido porque frontend y API viven en dominios distintos.
- [fase.6] Deploy backend (Render): Root `backend/`, Build `npm ci && npx prisma generate && npm run build`, Start `npx prisma migrate deploy && node dist/main.js`, env `DATABASE_URL`, `JWT_*_SECRET`, `NODE_ENV=production`, `ALLOWED_ORIGINS=https://<front>.vercel.app`.
- [fase.6] Deploy frontend (Vercel): Root `frontend/`, Framework Next.js.
- [fase.6] Fix cookies cross-origin: los navegadores bloquean cookies third-party (`vercel.app` → `onrender.com`), dejando `/api/auth/me` en 401 tras login. Solución: **proxy same-origin** en `frontend/vercel.json` (rewrite `/api/:path*` → backend Render) + `NEXT_PUBLIC_API_URL=<front>.vercel.app`. La cookie pasa a ser first-party; backend sin cambios.
- [fase.6] Neon conectado vía CLI (`neon init --agent`): proyecto **hackathon_eth**, org `org-silent-flower-89199288`, contexto en `backend/.neon`. `neon env pull` escribió `DATABASE_URL` (pooled) y `DATABASE_URL_UNPOOLED` (directa) en `backend/.env`.
- [fase.6] `schema.prisma` añade `directUrl = env("DATABASE_URL_UNPOOLED")`: migraciones van por conexión directa, la app por pooled.
- [fase.6] Migraciones aplicadas y seed ejecutado contra Neon (admin `admin@invoiceshield.dev`, analistas `analista@continental.pe` / `analista@peru.pe`, facturas demo).
- [fase.6] Fix build de producción: `tsconfig.json` ganaba `rootDir: "src"` (emitía `dist/src/main.js` y rompía `node dist/main.js` en Render). Ahora `nest build` emite `dist/main.js`; `test/` y `prisma/` excluidos de `tsc` (e2e siguen vía ts-jest).

## [fase.6.entorno] — Entorno local: `.env` reales y fixes de arranque (completado)

- [fase.6.entorno] `backend/.env` completo: `ARBITRUM_RPC_URL`, `ARBITRUM_PRIVATE_KEY` (signer keystone `0x06F5...bAA35`), `ARBITRUM_CHAIN_ID=421614`, `ARBITRUM_TOKEN_DECIMALS=6`, `BLIND_BID_VAULT_ADDRESS` (desplegado con código en Sepolia), `AGENT_ENCRYPTION_KEY` (64 hex generada) y `ALLOWED_ORIGINS` con la URL de Vercel.
- [fase.6.entorno] `frontend/.env.local` creado: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA`.
- [fase.6.entorno] Fix DI: `BiddingModule` no importaba `BlockchainModule` → `BiddingService` no resolvía `ArbitrumService` y el bootstrap fallaba. Añadido `imports: [BlockchainModule]`.
- [fase.6.entorno] Fix DTOs `create-auction.dto.ts`: `@Min/@Max` de class-validator solo validan números, así que sobre strings (`title`, `description`, `secret`, `proposalUri`) rechazaban cualquier input. Sustituidos por `@Length(1, N)`. `aiScore` pasa de `@IsNumberString()` (string) a `@IsInt() @Min(0) @Max(100)` (coherente con `Int` en Prisma). `commitEnd/revealEnd` tipados `string` (se consumen con `BigInt()`).
- [fase.6.entorno] Fix firma on-chain: `ArbitrumService.send()` pasaba la dirección (string) como `account`, así que viem enviaba `eth_sendTransaction` (firma del nodo) y Alchemy respondía `Unsupported method`. Ahora se conserva el objeto signer (`privateKeyToAccount`) en `assertReady()` y `send()` firma localmente con `eth_sendRawTransaction`.
- [fase.6.entorno] Fix serialización: `syncAuction` guardaba `winningPrice: 0n` y `winner: 0x000...0` (dirección zero) sin ganador → `GET /api/auctions` crasheaba con `Do not know how to serialize a BigInt`. Ahora se normaliza a `null` y `serializeAuction` convierte `winningPrice`/`createdBlock` a string defensivamente.
- [fase.6.entorno] Verificación E2E on-chain: login admin, `POST /api/auctions` con tx confirmada (`0xb3d5d924...`, auctionId 1, token USDC `0x75faf1...`), `GET /api/auctions` y `GET /api/auctions/1` en verde.
- [fase.6.entorno] Calidad: lint limpio, `tsc --noEmit` sin errores, `nest build` OK, 39/39 tests en verde.
- [fase.6.entorno] Nota de seguridad: `ARBITRUM_PRIVATE_KEY` quedó expuesta en el canal de chat; rotar antes de ir a producción.
- [fase.6.entorno] Fix deps frontend: `wagmi` baja de `^3.7.6` a `^2.19.5` — `@rainbow-me/rainbowkit@2.2.11` (última versión) exige `wagmi@^2.9.0` y `npm ci` limpio fallaba con ERESOLVE. El código web3 solo usa APIs compatibles con v2 (`createConfig` + `transports`), así que typecheck/build no cambian.
- [fase.6.entorno] Fix build Turbopack: `@coinbase/cdp-sdk@1.55.0` (transitivo de `@wagmi/connectors`) hace `import()` dinámicos de `@x402/*` declarados como peers **opcionales**, que npm no instala → `next build` fallaba con `Module not found: Can't resolve '@x402/core/client'`. Se instalaron explícitamente `@x402/core`, `@x402/evm`, `@x402/extensions`, `@x402/svm` (v2.21.0). Ahora `npm ci` reproducible, build OK.
- [fase.6.entorno] Smoke final: `next start` sirve `/`, `/login`, `/auctions` (200) con backend en `http://localhost:4000` (health `database: up`).
- [fase.6.entorno] Script dev único: `dev.sh` en raíz (sin deps extra, bash puro con `trap` + `wait`) que levanta frontend (`next dev`) y backend (`nest start --watch --no-shell`) en paralelo y limpia ambos al hacer Ctrl+C. `package.json` raíz: `dev` → `./dev.sh`, `dev:frontend`/`dev:backend` con `--prefix`.
- [fase.6.entorno] Fix `nest start` en rutas con `&`: el directorio `ethackhaton-frontend&backend` contiene un `&` que rompía el spawn por shell de Nest (`/bin/sh: backend/backend/dist/main: not found`, `Cannot find module '...ethackhaton-frontend'`). `nest start` tiene `--shell` activo por defecto; se añadió `--no-shell` a `start:dev` para spawn directo de node (a prueba de `&`).
- [fase.6.entorno] Fix `RangeError: Invalid currency code: USDC`: `Intl.NumberFormat` solo acepta divisas ISO 4217; `formatMoney` recibía símbolos de token (`USDC`/`USDT`/`DAI`) → crash. Ahora `TOKEN_TO_ISO` mapea tokens a `USD` y un `try/catch` cae a formato numérico para códigos inválidos (`lib/format.ts`). Tests añadidos (23 en total).
- [fase.6.entorno] Menú lateral: añadido `/auctions` ("Licitaciones") con permiso `AUCTIONS_VIEW` — las rutas existían (`/auctions`, `/auctions/new`, `/auctions/[id]`) pero no eran accesibles desde el nav (`app-shell.tsx`).

## [fase.6.contracts] — Despliegue BlindBidVault en Arbitrum Sepolia (completado)

- [fase.6.contracts] Workspace `contracts/` (Foundry): `foundry.toml` (solc 0.8.24, optimizer 200 runs), `remappings.txt`, `src/BlindBidVault.sol` (movido desde `frontend/lib/web3/contracts/`, fuente única del contrato), `script/DeployBlindBidVault.s.sol`, `deploy.sh` (dry-run/`--broadcast`), `.env.example` (gitignore del `.env`).
- [fase.6.contracts] Deps: `forge-std` v1.9.4 y `openzeppelin-contracts` v5.3.0 como submódulos de git en `contracts/lib/`.
- [fase.6.contracts] Constructor del vault: token USDC Circle `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`, `priceWeight=70`, `qualityWeight=30` (el backend lee ambos pesos on-chain).
- [fase.6.contracts] Desplegado en **Arbitrum Sepolia (421614)**: `BlindBidVault` en **`0x80d5408c6a0496e7318b94613d11128ba9d844ff`** (tx `0xd12a9525...4630c7`). Deployer `0x06F53057F6428a3D666d6033D7Ac8E5D713bAA35` = signer del backend.
- [fase.6.contracts] Roles on-chain verificados: deployer con `DEFAULT_ADMIN_ROLE` (constructor) y `AUDITOR_ROLE` (tx `grantRole` `0xcb02a456...0762d6`) para que el backend pueda llamar `setAuditScore`.
- [fase.6.contracts] Verificación on-chain: código presente, `priceWeight=70`, `qualityWeight=30`, `token=0x75faf1...`, `hasRole(AUDITOR_ROLE, deployer)=true`.
- [fase.6.contracts] Dirección propagada: `backend/.env` (`BLIND_BID_VAULT_ADDRESS`), `frontend/.env.local` (`NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA`) y fallback en `frontend/lib/web3/contracts/addresses.ts`.
- [fase.6.contracts] Fix CORS en `backend/.env.example`: `ALLOWED_ORIGINS` era `"http://...","https://..."` (comillas por valor que rompían `allowedOrigins()` de `config.ts`); ahora es un único string separado por comas.




