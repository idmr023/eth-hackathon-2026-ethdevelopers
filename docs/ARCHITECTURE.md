# Arquitectura técnica — LicitaBien

## 1. Visión general

LicitaBien es una **plataforma descentralizada de licitaciones públicas y adjudicación de contratos** para MYPES y entidades peruanas sobre **Arbitrum Sepolia**, que combina:

- **Subastas BlindBid** (commit–reveal) on-chain para evitar filtraciones de ofertas, colusión y manipulación de adjudicaciones.
- **Evaluación de propuestas por IA** (OpenRouter / Llama 3.1 Nemotron) que produce un `aiScore` de calidad (0–100).
- **Scoring compuesto** precio + calidad ponderado en el contrato (`priceWeight` / `qualityWeight`).
- **Credenciales verificables con EAS** (Ethereum Attestation Service) que emiten atestaciones de reputación y adjudicación.

Capa | Tecnología | Rol
---|---|---
**Frontend** | Next.js (App Router), Tailwind v4, wagmi/viem, RainbowKit | Visualización, commit/reveal de ofertas y firma de transacciones
**Backend** | NestJS 11, Prisma 6 | Autoridad de negocio: RBAC, validaciones, scoring IA, orquestación on-chain
**Datos** | Neon PostgreSQL | Espejo relacional + logs WORM
**Contrato** | BlindBidVault (Arbitrum Sepolia) | Subastas commit–reveal, escrow de stakes
**Atestaciones** | EAS (Arbitrum Sepolia) | Credenciales de reputación y adjudicación

## 2. Flujo principal de una licitación

```mermaid
sequenceDiagram
  participant E as Entidad (licitante)
  participant B as Backend NestJS
  participant C as Contrato BlindBidVault
  participant IA as IA (OpenRouter)
  participant S as Proveedor (licitador)
  E->>B: Crea licitación (presupuesto, alcance, plazos)
  B->>C: createAuction(...) con priceWeight/qualityWeight
  S->>B: Registra propuesta + compromete oferta sellada
  B->>B: Valida commitment keccak256(price, secret) on-chain
  B->>IA: Evalúa propuesta (calidad, cumplimiento, costo)
  IA->>B: aiScore (0–100) → setAuditScore on-chain
  Note over C: Fin de ventana reveal → settleAuction()
  C->>B: Gana el mejor score compuesto (precio + calidad)
  B->>B: Emite credencial EAS de adjudicación/reputación
```

## 3. Subastas BlindBid (commit–reveal)

El contrato `BlindBidVault` implementa subastas de **oferta sellada** con revelado opcional delegado.

### Estados de una subasta

```
ACTIVE (ventana commit → ventana reveal)
   │  commitEnd
   ▼
ACTIVE (ventana reveal)
   │  revealEnd → settleAuction()
   ▼
SETTLED (ganador + precio adjudicado)   CANCELLED
```

### Mecánica

1. **Organizador** crea la subasta: `createAuction(treasury, stakeAmount, minPrice, maxPrice, commitEnd, revealEnd)`. El backend firma y **espeja** el estado on-chain en la tabla `auction`.
2. **Postores** comprometen `commitBid(auctionId, commitment)` donde:
   ```
   commitment = keccak256(abi.encodePacked(uint256 price, string secret))
   price = parseUnits(priceUsd, 6)   # USDC, 6 decimales
   ```
   La fórmula vive duplicada a propósito en backend (`bidding.service.ts`) y frontend (`useBlindBidVault`) — es el **vínculo off-chain ↔ on-chain**.
3. **Reveal nativo**: `revealBid(auctionId, bidder, price, secret)` — el contrato verifica que `keccak256(encodePacked(price, secret)) == commitment.hash` antes de contabilizar.
4. **Reveal delegado (agente)**: el postor llama `POST /api/auctions/:id/delegate-reveal` con `(price, secret)`. El backend valida el commitment on-chain, **cifra el secret con AES-256-GCM** (`AGENT_ENCRYPTION_KEY`) y lo guarda en `delegation` para que el agente lo revele automáticamente al final de la ventana.
5. **Scoring**: `priceWeight` + `qualityWeight` (porcentajes del contrato) combinan el precio con `auditScores` (IA, 0–100) cargados por auditores vía `POST /api/auctions/:id/audit-score`.
6. **Settlement**: `settleAuction` adjudica al mejor score compuesto, devuelve o aplica *slash* a los stakes, y el ganador recibe su credencial de adjudicación.

### Invariantes de seguridad

- El **secret nunca viaja sin cifrar** fuera del TLS: se cifra AES-GCM en reposo y el frontend nunca lo persiste en claro.
- El backend **recalcula el commitment** al delegar y rechaza `(price, secret)` que no matcheen (`INVALID_REVEAL_SECRET`).
- La subasta solo es liquidable después de `revealEnd` (regla on-chain).
- `commitEnd < revealEnd` validado tanto en backend (DTO) como en frontend.

## 4. Modelo de datos (Prisma)

- `users` · `sessions` (refresh rotatorio hash-SHA256) · `login_attempts`
- `licitaciones` / `proposals` (propuestas con evaluación IA) · `delegation` (secrets cifrados) · `audit_verdict` (scoring IA)
- `audit_logs` (**WORM**: triggers + `REVOKE` de UPDATE/DELETE)
- `auction` (espejo del contrato, único por `contractAddress + auctionId`)

## 5. Seguridad

| Medida | Implementación |
|---|---|
| Sesión | Cookies `httpOnly`: `is_session` 15m + `is_refresh` 7d rotatorio single-use; lockout 5 intentos/15min |
| RBAC | 7 permisos, guards con super-gate para admins |
| Rate limit | login 20/15min, refresh 60/15min, global 300/min |
| Auditoría | `audit_logs` WORM vía triggers + `set_config('app.actor_user_id')` |
| Hash del activo | Calculado **solo en backend** |
| Secreto BlindBid | AES-256-GCM en reposo (`shared/crypto.service`) |
| IA resiliente | `AiEvaluationService` cae a heurística determinista si OpenRouter no responde o falta `OPENROUTER_API_KEY` |
| Transporte | Helmet CSP, CORS restringido a `ALLOWED_ORIGINS`, ValidationPipe estricto |

## 6. Calidad (gate por fase)

- `lint` (ESLint estricto) · `typecheck` (`tsc --noEmit`) · `test` · `build` — exigidos en CI (`.github/workflows/ci.yml`).
- Backend: 39 unit + 4 e2e · Frontend: 21 unit (vitest).

## 7. Despliegue

- **Frontend → Vercel** (proyecto Next.js, root `frontend/`), proxy same-origin en `vercel.json` hacia el backend para cookies first-party.
- **Backend → Render** (Web Service, root `backend/`), `npx prisma migrate deploy && node dist/main.js`.
- **DB → Neon** (conexión pooled + `DATABASE_URL_UNPOOLED` para migraciones).
- **Contratos** → Arbitrum Sepolia: `BlindBidVault` y esquemas EAS (ver `contracts/script/`).

Detalle completo de despliegue en `CHANGELOG.md` → `[fase.6]`.
