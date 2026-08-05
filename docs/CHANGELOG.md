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

## [fase.5] — Documentación final (pendiente)

- [fase.5] README raíz, README por carpeta, `docs/` final.
