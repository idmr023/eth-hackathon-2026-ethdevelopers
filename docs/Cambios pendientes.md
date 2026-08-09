Plan de implementación — Fases 1 y 2
Fase 1 — [fase.7.licitabien.auth] · Auth completo (UX + registro + recuperación + 2FA)
Decisiones cerradas contigo: switch libre sin recordar última vista, Mi cuenta en /licitabien/cuenta.
1.1 Switch libre de persona (desacoplar rol → persona)
persona.ts hoy deriva persona del rol (getPersona en frontend/lib/licitabien/persona.ts:11-13) y bloquea la nav. Cambios:
- persona.ts: reemplazar getPersona por constantes puras de rutas: DEFAULT_APP_ROUTE = "/licitabien/licitante" + PERSONA_ROUTES. Eliminar el mapeo por rol.
- 6 importadores confirmados (no 7):
- frontend/components/app-shell.tsx:14 y :31-37 (DEMO_ITEMS por persona) → lista estática con ambos paneles + "Perfil y reputación" para cualquier usuario autenticado.
- frontend/components/licitabien/licitabien-nav.tsx:7,39-40,50 → con sesión: enlaces a ambos paneles + "Perfil y reputación" + "Mi cuenta" + "Cerrar sesión"; sin sesión: "Iniciar sesión" + "Registrarse".
- frontend/components/licitabien/licitacion-detail-view.tsx:12,95 → backHref al panel por defecto.
- frontend/components/licitabien/landing-view.tsx:14,141-145 → CTA con sesión va a DEFAULT_APP_ROUTE.
- frontend/components/licitabien/unified-dashboard-view.tsx → eliminar (ya no hay persona derivada).
- frontend/app/licitabien/dashboard/page.tsx → redirect(DEFAULT_APP_ROUTE).
- Bug landing: landing-view.tsx:169-175 "Registrarse" se renderiza siempre → ocultarlo si user != null.
1.2 Modelo de usuario (Prisma)
Añadir a User en backend/prisma/schema.prisma: phone String?, dni String? @unique, recoveryQuestion String?, recoveryAnswerHash String?, totpSecret String?, totpEnabled Boolean @default(false). Migración: npx prisma migrate dev --name fase7_auth; si hay drift en Neon → fallback prisma db push.
1.3 Backend — Auth (backend/src/modules/auth/)
DTOs nuevos: dto/register.dto.ts, dto/recovery.dto.ts, dto/two-fa.dto.ts (validaciones: phone 9 dígitos, dni 8 dígitos, password reusa isValidPassword).
auth.service.ts — métodos nuevos:
- register(...) → crea usuario rol ANALYST, mustChangePassword=false; hashea password y recoveryAnswerHash con bcrypt; valida email/dni únicos.
- recoveryInit(email) → devuelve { question } (placeholder genérico si el email no existe, para no filtrar).
- recoveryReset(email, answer, newPassword) → verifica bcrypt de la respuesta, actualiza password, revokeAllUserSessions.
- setup2fa(userId) → otplib genera secret → { secret, otpauthUri, qrDataUrl } (QR en data URL con qrcode, sin dep frontend).
- confirm2fa(userId, code) / disable2fa(userId, code) → activa/desactiva TOTP.
- login() modificado: si totpEnabled → NO emite cookies; devuelve { step: 'verify-2fa', pendingToken } (JWT 5 min). verify2fa(pendingToken, code) → emite sesión real + cookies.
- toView/signAccessToken + AuthUserView + AccessTokenPayload (auth.guard.ts:19-26): añadir totpEnabled.
auth.controller.ts — endpoints: POST /auth/register (Public), POST /auth/recovery/init (Public), POST /auth/recovery/reset (Public), POST /auth/2fa/setup, POST /auth/2fa/confirm, POST /auth/2fa/disable, POST /auth/login/verify-2fa (Public). Nota: MUST_CHANGE_ALLOWLIST (auth.guard.ts:12-17) no necesita cambio.
Deps: otplib, qrcode (+ @types/qrcode).
1.4 Frontend — Auth
- lib/types.ts: AuthUser/AuthUserView + totpEnabled.
- lib/auth.ts: register(), recoveryInit(), recoveryReset(), setup2fa(), confirm2fa(), disable2fa(), verify2fa(); login() soporta respuesta { step: 'verify-2fa', pendingToken }.
- login-form.tsx: máquina de estados (credenciales → código de 6 dígitos), links a "Regístrate" y "¿Olvidaste tu contraseña?", redirect por defecto a DEFAULT_APP_ROUTE.
- Páginas nuevas: app/register/page.tsx + register-form.tsx; app/forgot-password/page.tsx + recovery-form.tsx (email → pregunta → respuesta+password); app/licitabien/cuenta/page.tsx + cuenta-view.tsx (datos, pregunta de recuperación, 2FA toggle con QR, link a cambiar contraseña).
1.5 Regla anti-auto-oferta
- Backend: licitaciones.service.ts:78 join() → si licitacion.organizerId === input.userId → AppError(VALIDATION_ERROR, 400, 'No puedes ofertar en tu propia licitación').
- Frontend: en supplier-dashboard-view.tsx y licitacion-detail-view.tsx ocultar/deshabilitar el botón de oferta cuando organizerId === user.id.
1.6 Seed + docs
- backend/prisma/seed.ts: phone/dni/recoveryQuestion/recoveryAnswerHash para admin y analistas.
- docs/CHANGELOG.md: sección [fase.7.licitabien.auth].
- Verificación: backend lint/typecheck/test (extender auth.service.spec.ts con register/2FA/recovery/self-dealing); frontend lint/typecheck/test/next build; reseed contra Neon.
Fase 2 — [fase.8.licitabien.onchain] · BlindBidVault real conectado y funcional (sin demos)
Ya verificado en vivo: contrato 0x80d5…44ff con código, priceWeight=70/qualityWeight=30, token USDC 0x75fa…aa4d, nextAuctionId=0. Puente viem (arbitrum.service.ts) y lecturas wagmi operativos. Lo que falta (lista "blockchain aún no listo"):
2.1 Escrituras on-chain faltantes en backend/src/modules/bidding/bidding.service.ts
Hoy solo escribe createAuction; recordAuditScore y delegateReveal solo tocan BD. Añadir:
- setAuditScore on-chain (AUDITOR_ROLE — el deployer/operador ya lo tiene, DeployBlindBidVault.s.sol). recordAuditScore() debe llamar al contrato y luego upsert del mirror.
- revealBid(auctionId, bidder, price, secret) — permissionless; backend la firma con la secretEncrypted de la delegation (auto-reveal).
- settleAuction(auctionId) — permissionless tras revealEnd.
- slashBid(auctionId, bidder) — permissionless tras revealEnd + marcar delegation FAILED.
Decisión de diseño (fundamental): commitBid y claimRefund son msg.sender-bound y mueven USDC del bidder → NO deben firmarlas el backend (mezclaría fondos del operador). Flujo correcto y coherente con la regla global #7 (hash calculado en servidor):
1. Backend calcula commitment = keccak256(abi.encodePacked(price, secret)) (commitmentHash ya existe, bidding.service.ts:422) y guarda la delegation cifrada.
2. El usuario firma la tx con su wallet en el frontend (useCommitBid ya existe en frontend/lib/web3/hooks/useBlindBidVault.ts:145).
3. createAuction: el wizard crea on-chain con la wallet del usuario (useCreateAuction ya existe); el backend sincroniza el mirror. Se conserva POST /api/auctions (operador) solo como vía seed/infra.
2.2 Hooks wagmi faltantes + flujo USDC
En frontend/lib/web3/hooks/useBlindBidVault.ts:
- useHasCommitted(auctionId, account) → hasCommitted del contrato.
- useCancelAuction(auctionId) (opcional).
- useSetAuditScore (solo si la wallet tiene AUDITOR_ROLE).
- useApproveUSDC + useTokenBalance + useAllowance sobre 0x75fa…aa4d (6 decimals, ARBITRUM_TOKEN_DECIMALS). El commit real = 2 txs: approve(vault, stakeAmount) → commitBid.
2.3 Conectar la UI Licitabien a on-chain (reemplazar demo)
- Listado/detalle: consumir el mirror vía auctionsApi (endpoints.ts:102-136 ya tiene create/detail/bidders/commitment/delegate-reveal/audit-score) o lecturas wagmi; el detalle muestra commitments, auditScores y estado on-chain reales.
- Wizard → createAuction con wallet + persistir título/descripción/categoría (hoy syncAuction pone title: Licitación #N, bidding.service.ts:177 — ampliar con metadata Json? en la tabla Auction o vincular a Licitacion).
- Panel proveedor → flujo approve → commit con stake USDC real.
- Detalle → reveal (auto o manual), settle, slash, claimRefund; badge de estado de tx (pending/confirmed/reverted) y links arbiscan (helpers chain.ts ya listos).
- Landing: el HeroAuctionCard pasa del mock (mock-data.ts) a la primera subasta on-chain activa.
2.4 Contratos — Tests Foundry (pendiente, AGENTS Fase 2)
Nuevo contracts/test/BlindBidVault.t.sol (forge test; foundry.toml ya configurado):
- Happy path commit-reveal → ganador por composite score (precio + auditoría).
- Griefing: no revelar → slashBid al treasury, excluido de refund.
- Refunds post-settle a no ganadores.
- Límites: price fuera de [min,max], constructor con weights ≠ 100, commit tras commitEnd.
- Roles: setAuditScore solo AUDITOR_ROLE; cancelAuction solo organizer.
- Fuzz/invariantes: el USDC total del contrato nunca se pierde (suma in == out).
2.5 Infra y smoke E2E en vivo
- Financiar el signer del backend (ETH Sepolia para gas) y wallets de bidders demo con USDC testnet (faucet.circle.com).
- Crear la primera subasta real en Sepolia y ejecutar el ciclo completo: createAuction → sync → approve → commit → reveal → settle → refund para validar el flujo end-to-end.
- Verificar que agent/auditor (directorios vacíos hoy) tengan su rol real o decidir su cierre.
2.6 Cierre
- docs/CHANGELOG.md: sección [fase.8.licitabien.onchain].
- Verificación: forge test + backend lint/typecheck/test (extender bidding.service.spec) + frontend lint/typecheck/test/next build + smoke E2E contra Sepolia.
Pendientes de decisión al implementar Fase 2 (marcadas, no bloquean): destino del módulo licitaciones demo (¿eliminar o mantener como fallback de lectura sin RPC?), commit custodial vs wallet (recomiendo wallet + hash en servidor), y dónde persisten título/metadata de la subasta.
¿Apruebas el plan para pasar a ejecución (saldría de plan mode) o ajustamos algo?