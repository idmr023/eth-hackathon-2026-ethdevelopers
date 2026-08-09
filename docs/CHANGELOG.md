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

## [fase.7.licitabien] — UI LICITABIEN (tema claro + demo cripto-invisible) (completado)

- [fase.7.licitabien] Fundación visual: fuentes DM Sans/Inter/JetBrains Mono vía `next/font/google` en `app/layout.tsx`; tokens de marca (emerald `#00C07A`, navy `#0D1B2E`) en `globals.css` + override scoped `.licitabien` del tema claro (sin tocar el tema oscuro de InvoiceShield); keyframes nuevos centralizados en `lib/animations.ts`.
- [fase.7.licitabien] Dominio mock: `lib/licitabien/{types,mock-data,format,chain,use-countdown}.ts` + tests `format.test.ts` (10 tests de countdown/monedas).
- [fase.7.licitabien] Kit de componentes `components/licitabien/`: PhaseBadge (4 estados + punto pulsante), ChainBadge (Arbiscan), CountdownRow (terminal navy con ticking 1s vía `useSyncExternalStore`), LockNote, TrustBadge (Garantía de Cero Manipulación), RwaCard (Financiamiento Inteligente / adelanto), CredentialCard + ReputationHeader (EAS), Timeline, Podium (Oro/Plata/Bronce + prueba Arbiscan), KpiCard, FilterPills, SuccessModal (loader verde → ¡Licitación Creada!), LicitacionWizard (3 pasos, misma vista), navegación del demo.
- [fase.7.licitabien] Landing pública en `/` (reemplaza el redirect): hero 2 columnas con tarjeta de licitación sellada (timer real, proveedores comprometidos, hashes, candado), métricas y sección de privacidad navy; botones "Iniciar sesión" → `/login` y "Registrarse" stub preparado para DB.
- [fase.7.licitabien] Demo comprador en `/licitabien/dashboard`: 4 KPIs, tabla LIC-2024-001…004 con filtros (Todas/Activas/Borradores/Cerradas), countdown en vivo por fila, indicador "Sincronizado con el contrato" y wizard modal sin cambio de página.
- [fase.7.licitabien] Detalle en `/licitabien/licitaciones/[id]`: timeline Publicada→Compromisos→Revelación→Resultado, compromisos sellados/revelados y Podio de ganadores con "Ver prueba en Arbiscan".
- [fase.7.licitabien] Demo proveedor en `/licitabien/proveedor`: licitación ganada + Financiamiento DeFi (Orden de Compra Tokenizada, CTA Factoring), formulario de oferta con TrustBadge y confirmación de sello.
- [fase.7.licitabien] Reputación EAS en `/licitabien/proveedor/perfil`: insignias criptográficas, Identidad Soberana, botones "Exportar credencial" / "Verificar en explorador".
- [fase.7.licitabien] Integración on-chain real: `lib/licitabien/chain.ts` con lecturas en vivo de `BlindBidVault` (Arbitrum Sepolia) vía hooks wagmi existentes (`useAuctionsCount`, `useAuction`; estado leído por índice `auction[7]`), enlaces Arbiscan reales y fallback elegante si el RPC falla.
- [fase.7.licitabien] Calidad: lint, typecheck y 33 tests en verde; `next build` OK con todas las rutas (landing, demo y panel existente intacto); smoke test HTTP 200 en las 7 rutas (`/`, `/login`, `/licitabien/*`).

## [fase.7.licitabien.data] — Backend como fuente de verdad (completado)

- [fase.7.licitabien.data] Schema Prisma: modelo `Licitacion` (+ enum `LicitacionPhase` y relación con `User`) con montos en enteros S/, fechas commit/reveal y `providers` JSON con el shape `LicitacionProveedor`; sync vía `prisma db push` (la BD remota de Neon ya tenía drift de migraciones) y generate.
- [fase.7.licitabien.data] `prisma/seed.ts`: 4 licitaciones demo `LIC-2024-001…004` con IDs estables para no romper URLs, hashes de compromiso y podio de la cerrada.
- [fase.7.licitabien.data] Módulo NestJS `licitaciones`: `GET /api/licitaciones` (público), `GET /api/licitaciones/:id` (público), `POST /api/licitaciones` y `POST /api/licitaciones/join` (requieren sesión vía guard global; sin roles). DTOs class-validator (whitelist estricta global), commitment Keccak256 real con viem, montos nunca persistidos (semántica de sobre cerrado).
- [fase.7.licitabien.data] Frontend `lib/licitabien/api.ts` (servicio con fallback a mock solo ante error de infraestructura) + hooks `use-licitaciones.ts` (`useLicitaciones` con `refresh` reutilizable y `useLicitacion` cancel-safe, sin `setState` síncrono en efectos).
- [fase.7.licitabien.data] Dashboard comprador consume el backend: las licitaciones creadas desde el wizard aparecen en la misma vista unificada; indicador de sincronización reemplazado por texto neutro.
- [fase.7.licitabien.data] Detalle por id desde el backend; el podio se deriva de los proveedores revelados (top 3 por monto) en vez del mock.
- [fase.7.licitabien.data] Login obligatorio para crear (wizard) y participar (oferta sellada): redirección a `/login?from=…` si no hay sesión, redirección respetada por `LoginForm`, y estados `publishing`/`sending` en los botones.
- [fase.7.licitabien.data] Nav con sesión: muestra el email del usuario autenticado en vez del botón fijo "Iniciar sesión".
- [fase.7.licitabien.data] Calidad: backend y frontend con lint + typecheck limpios; 39 tests backend y 33 tests frontend en verde; smoke test E2E (login → crear → join, y 401 sin sesión) contra el servidor en vivo.

## [fase.7.licitabien.unify] — Diseño único LICITABIEN en toda la app (completado)

- [fase.7.licitabien.unify] Tema claro global: los tokens LICITABIEN (emerald/navy/ink/mist, fuentes DM Sans/Inter/JetBrains Mono) se movieron a `:root` en `globals.css`; `color-scheme: light`, `body` en claro y glow radial del brand; el bloque scoped `.licitabien` se conserva como override inofensivo.
- [fase.7.licitabien.unify] Contraste del UI kit en claro: `Button` primary ahora es blanco sobre el verde de marca (se quitó el `text-[#04121a] hover:bg-cyan-300`), `Badge`/`InlineSuccess`/`STATUS_COLORS` pasaron de tonos `-300` a `-600/700` para texto legible sobre fondo claro.
- [fase.7.licitabien.unify] `AppShell` unificado con la marca: logo LICITABIEN en el sidebar, fondo blanco, activos en `brand-soft`/`brand-dark`, header `bg-white/85` con iniciales en `brand-soft`; se añadieron al sidebar los accesos al demo (comprador, proveedor, perfil) junto a Licitaciones BlindBid y Usuarios.
- [fase.7.licitabien.unify] `/login` con el marco del producto: header con logo + "Volver al inicio", card redondeada `rounded-2xl` con icono de marca y credenciales demo en `bg-mist`; el destino por defecto tras iniciar sesión (sin `?from=`) pasa de `/auctions` a `/licitabien/dashboard`.
- [fase.7.licitabien.unify] CTA inteligentes en la landing: "Publicar mi primera licitación gratis" y "Listo para iniciar con garantías, dale clic aquí" revisan sesión (`useAuth`) → con sesión van a `/licitabien/dashboard`, sin sesión a `/login?from=/licitabien/dashboard`; el header de la landing muestra el email si ya hay sesión.
- [fase.7.licitabien.unify] Calidad: lint + typecheck limpios y 33 tests frontend en verde; smoke HTTP 200 en `/`, `/login`, `/licitabien/dashboard`, `/licitabien/proveedor` y `/auctions`.

## [fase.7.licitabien.roles] — Separación de roles licitante/licitador (completado)

- [fase.7.licitabien.roles] Backend `licitaciones`: `serialize()` ahora expone `organizerId`; `POST /api/licitaciones/join` lee el usuario de sesión (`@CurrentUser`) y persiste el proveedor con `userId` en el JSON `providers`. La detección de duplicado valida por `name` **o** `userId` (un mismo usuario no puede ofertar dos veces, aun con nombres distintos).
- [fase.7.licitabien.roles] Seed: todas las licitaciones demo (`LIC-2024-001…004`) quedan con `organizerId: admin.id`; nueva **LIC-2024-005** "Auditoría de seguridad informática 2025" (OPEN, S/ 3 600 000) con participación del admin como proveedor (`userId: admin.id`) para demostrar ambas caras del flujo; upsert actualiza `organizerId`/`phase` en registros existentes (reseed idempotente).
- [fase.7.licitabien.roles] Frontend: `lib/licitabien/persona.ts` mapea sesión → persona (`ADMIN` = licitante, resto = licitador) con rutas `PERSONA_ROUTES` y helper `getPersonaRoute`; `require-auth.tsx` (gate con redirect a `/login?from=…` + spinner) y `unified-dashboard-view.tsx` (elige panel según persona) en `components/licitabien/`.
- [fase.7.licitabien.roles] Rutas nuevas: `/licitabien/licitante` (panel del organizador), `/licitabien/licitador` (panel del proveedor) y `/licitabien/perfil` (reputación), todas bajo `RequireAuth`. Redirecciones: `/licitabien/dashboard` → panel según persona, `/licitabien/proveedor` → `/licitabien/licitador`, `/licitabien/proveedor/perfil` → `/licitabien/perfil`.
- [fase.7.licitabien.roles] Paneles filtrados por rol: el licitante solo ve sus licitaciones (`organizerId === user.id` o sin organizer), el licitador solo sus ofertas (`providers` con su `userId`); encabezados "Panel licitante"/"Panel licitador" y detalle con "Volver" hacia el panel de la persona (`getPersonaRoute`).
- [fase.7.licitabien.roles] Navbar y shell por rol: `LicitabienNav` muestra los enlaces de la persona autenticada + botón "Cerrar sesión" (o "Iniciar sesión" sin sesión), logo que vuelve al panel; `AppShell` filtra los accesos demo según persona; wizard y CTA de la landing redirigen a `/login?from=/licitabien/licitante` (o al panel si hay sesión).
- [fase.7.licitabien.roles] Calidad: lint + typecheck limpios en backend y frontend; 39 tests backend y 33 tests frontend en verde; `next build` OK con las 21 rutas (incluye las 3 nuevas y los 3 redirects); reseed aplicado contra Neon.






