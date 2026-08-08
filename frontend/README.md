# InvoiceShield · Frontend

dApp **Next.js 16 (App Router) + Tailwind CSS v4 + React 19** del protocolo InvoiceShield. Cliente de la API NestJS y capa de interacción on-chain con **wagmi 3 + RainbowKit 2** sobre **Arbitrum Sepolia**.

> El frontend es **solo un visualizador**: la validación de negocio, RBAC y hashes residen estrictamente en el backend.

## Stack

- **Next.js 16.3** (App Router, server + client components, Turbopack)
- **Tailwind CSS v4** con theme cyberpunk-neón sobrio
- **@tanstack/react-query** para datos del backend
- **wagmi 3 + viem 2 + RainbowKit 2** para wallet y contratos
- **Vitest** para tests unitarios

## Estructura

```
app/
├── (app)/            → rutas autenticadas (layout con AppShell y sidebar por permisos)
│   ├── dashboard/    → KPIs + recientes
│   ├── invoices/     → lista, registro, detalle (firma SUNAT/CAVALI)
│   ├── fraud-alerts/ → alertas de doble financiamiento
│   ├── adapters/     → estado de oráculos simulados
│   ├── audit/        → log WORM filtrable
│   ├── admin/        → usuarios y factores
│   └── auctions/     → lista, creación y detalle BlindBid ([id])
├── login/            → autenticación
└── page.tsx          → redirección por sesión
components/
├── ui/               → button, card, input, badge, table (kit)
├── modules/<dominio>/→ vistas por dominio
├── web3/             → WalletButton (RainbowKit)
└── is-auth-provider.tsx → bootstrap de sesión (loading/authenticated/unauthenticated)
lib/
├── api.ts            → apiFetch con cookies y envelope { ok, data, total? }
├── endpoints.ts      → clientes tipados por dominio (invoices, auctions, users…)
├── types.ts          → tipos espejo del backend
├── permissions.ts    → helpers RBAC de UI
├── format.ts         → moneda es-PE, fechas, hashes cortos
└── web3/             → Web3Provider, wagmi config, ABI + addresses, hooks BlindBidVault
```

## Rutas principales

| Ruta | Descripción |
|---|---|
| `/login` | Login con sesión httpOnly |
| `/dashboard` | KPIs y actividad reciente |
| `/invoices` · `/invoices/new` · `/invoices/[id]` | Lista, registro y detalle de facturas con firma SUNAT/CAVALI |
| `/fraud-alerts` | Alertas de doble financiamiento |
| `/adapters` | Estado de los adaptadores |
| `/audit` | Auditoría WORM |
| `/admin/users` · `/admin/factors` | Administración |
| `/auctions` · `/auctions/new` · `/auctions/[id]` | Licitaciones BlindBid: lista, creación y commit–reveal |

## Web3 / BlindBidVault

La interacción con el contrato vive en `lib/web3/` (nunca en componentes):

- `lib/web3/wagmi.ts` — config wagmi (Arbitrum Sepolia + Arbitrum, conectores injected/metaMask/walletConnect).
- `lib/web3/Web3Provider.tsx` — WagmiProvider + QueryClient + RainbowKitProvider.
- `lib/web3/contracts/BlindBidVault.ts` — ABI; `addresses.ts` — direcciones por chain.
- `lib/web3/hooks/useBlindBidVault.ts` — hooks read/write: `useAuction`, `useAuctionsCount`, `useCommitment`, `useCommitBid`, `useRevealBid`, `useClaimRefund`, `useSettleAuction`, `useSlashBid`, `useAuditScore`, `useCreateAuction`.

**Commit-reveal** en `/auctions/[id]`: el commitment es `keccak256(abi.encodePacked(uint256 price, string secret))` con `price = parseUnits(price, 6)` (USDC, 6 decimales), igualando la fórmula del backend (`bidding.service.ts`). Se soporta commit nativo, reveal nativo y **delegación de revelación** al agente (`/api/auctions/:id/delegate-reveal`).

## Variables de entorno (`.env.local`)

Ver [`frontend/.env.example`](.env.example). Claves:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (`http://localhost:4000`) |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Proyecto WalletConnect (opcional) |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` / `NEXT_PUBLIC_ALCHEMY_API_KEY` | RPC (opcional) |
| `NEXT_PUBLIC_BLIND_BID_VAULT_ADDRESS_SEPOLIA` | Dirección del vault (opcional, tiene fallback) |

## Comandos

```bash
npm run dev            # servidor de desarrollo (http://localhost:3000)
npm run build          # next build (producción)
npm run start          # next start
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest
```

## Tests

21 tests unitarios con **Vitest**: `lib/format.test.ts` (moneda, fechas, hashes), `lib/permissions.test.ts` (RBAC UI), `lib/api.test.ts` (envelope y errores del API).
