# InvoiceShield — AGENTS.md

Protocolo criptográfico de coordinación y prevención de fraude en factoring B2B (Arbitrum). Repositorio raíz con `backend/` (NestJS + Prisma + Neon) y `frontend/` (Next.js App Router).

## Comandos

- Backend: `cd backend && npm run dev` | `npm run test` | `npm run lint` | `npm run typecheck` | `npx prisma migrate dev` | `npx prisma db seed`
- Frontend: `cd frontend && npm run dev` | `npm run test` | `npm run lint` | `npm run typecheck`

## Reglas globales

1. **Nunca** versionar `.env` ni secretos. Solo `.env.example`.
2. **Auditoría WORM**: jamás escribir UPDATE/DELETE directo en `audit_logs` (los triggers lo bloquean).
3. **Backend es la autoridad** de permisos y reglas de negocio. El frontend solo filtra UI.
4. Todo cambio: lint + typecheck + tests verdes antes de cerrar. **Tolerancia cero a deuda técnica**.
5. Respuesta API siempre `{ ok, data, total? }`. Errores con `code` del catálogo.
6. Documentar en `docs/` y en `docs/CHANGELOG.md` con ítems `[fase.x]`.
7. El **hash Keccak256** de la factura se calcula server-side; nunca confiar en hashes del cliente para decisiones.
8. Los adaptadores SUNAT/CAVALI son **simulados** y aislados tras una interfaz (`AdapterService`) reemplazable por oráculos reales.

## Convenciones de código

- TypeScript estricto, ESLint 9, Prettier.
- Backend: módulos por dominio `controller → service → repository`. Controllers finos, sin negocio. Services sin acceso a `req/res`. Repos solo Prisma.
- Frontend: `app/` con `page.tsx` finos que delegan en `components/modules/<dominio>`. Componentes `is-*` para UI. Animaciones centralizadas en `lib/animations.ts`.
- Nombrado: DB `snake_case`, TS `camelCase` (servicios/funciones) y `PascalCase` (clases/componentes), archivos `kebab-case`.
