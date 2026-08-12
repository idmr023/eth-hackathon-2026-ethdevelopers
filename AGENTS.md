# 🛡️ LicitaBien (InvoiceShield) — AGENTS.md
### El "Brain-Context" para Agentes de IA en el Repositorio

Este archivo sirve como la **especificación técnica unificada, mapa de arquitectura y manual de instrucciones** para cualquier Agente de IA que colabore en este codebase.

---

## 🌌 Visión y Contexto del Negocio (RWA + DeFi + IA)

**LicitaBien** es una plataforma descentralizada de licitaciones públicas y adjudicación de contratos para MYPES y entidades peruanas sobre **Arbitrum Sepolia**, diseñada para blindar los procesos de licitación y factoring:
1.  **Licitaciones Commit–Reveal:** Ofertas selladas on-chain vía `BlindBidVault` que impiden filtraciones, colusión y manipulación de la adjudicación.
2.  **Evaluación por IA:** Análisis automatizado de propuestas con OpenRouter / Llama 3.1 Nemotron que produce un `aiScore` de calidad (0–100).
3.  **Credenciales EAS:** Atestaciones on-chain de reputación y adjudicación mediante Ethereum Attestation Service.

### Flujo de Coordinación Financiera
1. **Creación de Licitación:** La entidad define presupuesto, alcance y plazos; el backend crea la subasta on-chain.
2. **Commit–Reveal:** El proveedor compromete una oferta sellada `keccak256(price, secret)` y la revela al cierre de la ventana.
3. **Auditoría de Riesgo por IA:** Análisis de la propuesta con OpenRouter / Llama 3.1 Nemotron.
4. **Scoring Compuesto:** `priceWeight` + `qualityWeight` combinan precio con `aiScore` en el contrato.
5. **Settlement:** `settleAuction` adjudica al mejor score, devuelve o aplica *slash* a los stakes.
6. **Credenciales:** Emisión de atestación EAS de adjudicación y reputación del ganador.

---

## 🛠️ Comandos de Ejecución

### 🖥️ Backend (NestJS)
```bash
cd backend
npm run dev
npm run test
npm run lint
npm run typecheck
npx prisma migrate dev
```

### 🎨 Frontend (Next.js)
```bash
cd frontend
npm run dev
npm run test
npm run lint
npm run typecheck
```

### ⬢ Smart Contracts (Foundry)
```bash
cd contracts
forge test
```

---

## 📋 Reglas Globales de Desarrollo y Seguridad

1. **Cero Hardcoding de Secretos:** Uso estricto de `.env.example`.
2. **Inmutabilidad WORM:** `audit_logs` con restricciones contra modificaciones directas.
3. **Autoridad en Backend:** El frontend actúa puramente como capa de presentación.
4. **Calidad CI:** Cero tolerancia a errores de linter, typecheck o tests fallidos.
5. **Formato JSON Estándar:** `{ ok: boolean, data: any, total?: number }`.
6. **Commit–Reveal en Servidor:** Nunca confiar en commits hasheados enviados por el cliente; el backend recalcula y valida on-chain.
7. **IA Resiliente:** `AiEvaluationService` debe caer a heurística determinista si OpenRouter falla o falta la clave.



---

## 📐 Convenciones de Código y Arquitectura Limpia

### Estructura del Backend (NestJS por Dominios)
El backend está diseñado de manera modular por dominios de negocio. El agente debe mantener el flujo limpio de responsabilidades:
```text
Controller (Solo manejo HTTP, validaciones rápidas, sin lógica)
    │
    ▼
Service (La autoridad exclusiva del negocio, análisis de riesgo de IA)
    │
    ▼
Repository / Prisma (Acceso limpio a la base de datos sin lógica de negocio)
```
*   Los controladores nunca deben acceder a los objetos `req` o `res` de Express directamente de forma desordenada.
*   Toda consulta a la base de datos PostgreSQL debe ser orquestada exclusivamente a través del cliente de Prisma.

### Estructura del Frontend (Next.js Modular)
*   **Rutas de Página:** El directorio `app/` contiene archivos `page.tsx` delgados encargados solo de la definición de rutas, SEO y metadata básica.
*   **Componentización:** Toda la lógica de componentes e interacciones de usuario debe delegarse a la estructura `/components/modules/<dominio>/`.
*   **Componentes de UI:** Los componentes visuales puros y sin estado deben seguir la convención `is-*` (ej: `is-button.tsx`, `is-card.tsx`).
*   **Animaciones:** Cualquier animación basada en librerías visuales debe ser centralizada en `/lib/animations.ts` para mantener la coherencia y rendimiento estético en toda la interfaz.

### Convenciones de Nombrado
*   **Base de Datos (Neon Postgres):** `snake_case` para tablas, columnas y triggers (ej: `audit_logs`, `invoice_hash`).
*   **Código TypeScript:** `camelCase` para variables, servicios, funciones y métodos (ej: `calculateKeccak256`, `getRiskAnalysis`).
*   **Clases y Componentes:** `PascalCase` para componentes React, controladores NestJS y clases (ej: `MypeDashboard`, `AdapterController`).
*   **Archivos Físicos:** `kebab-case` para nombres de archivos y carpetas (ej: `risk-analysis-service.ts`, `is-status-badge.tsx`).

---

## Filosofía del Proyecto

LicitaBien es un MVP para una hackathon.

Siempre priorizar:

1. Código funcional antes que sobreingeniería.
2. Simplicidad antes que abstracciones.
3. Legibilidad antes que optimizaciones prematuras.
4. Componentes pequeños.
5. Servicios con una única responsabilidad.

No implementar funcionalidades "por si acaso".

## Restricciones

Nunca:

- usar any.
- usar ts-ignore.
- comentar bloques grandes de código.
- duplicar lógica.
- crear utilidades genéricas sin uso.
- instalar dependencias nuevas si ya existe una solución.
- modificar contratos si la tarea es solo frontend.
- modificar Prisma si la tarea no requiere cambios en la base de datos.
- romper compatibilidad con Scaffold-ETH.

## Estrategia de modificación

Antes de escribir código:

1. Buscar implementaciones existentes.
2. Reutilizar servicios.
3. Modificar el menor número posible de archivos.
4. Explicar cualquier cambio arquitectónico.
5. Evitar refactors innecesarios.

Nunca reescribir un módulo completo para agregar una sola función.

## Límites

Intentar mantener:

Componentes React
< 250 líneas

Servicios Nest
< 350 líneas

Contratos
< 400 líneas

Si se supera ese tamaño,
proponer dividir el archivo.


## Reglas Solidity

Todo contrato debe:

- usar custom errors.
- emitir eventos.
- validar entradas.
- documentar funciones públicas con NatSpec.
- minimizar storage writes.
- evitar loops no acotados.
- usar OpenZeppelin cuando sea posible.


## Frontend

Nunca colocar lógica blockchain en componentes visuales.

Toda interacción con contratos debe vivir en:

hooks/
services/

Los componentes deben ser únicamente presentacionales.

## Comportamiento esperado

Cuando recibas una tarea:

1. Analiza primero la arquitectura.
2. Identifica los módulos afectados.
3. Explica el plan.
4. Implementa.
5. Verifica compilación.
6. Resume los cambios.
7. Propón mejoras únicamente si aportan valor.


## Estado del MVP

Fase 1
- [x] Monorepo
- [x] Scaffold-ETH

Fase 2
- [x] Contratos BlindBidVault + EAS Schemas
- [x] Tests

Fase 3
- [x] Backend

Fase 4
- [x] Frontend

Fase 5
- [x] Demo / Documentación

Fase 6
- [ ] Despliegue (Vercel + Render)


## 🤖 Directrices de Comportamiento para Agentes de IA

Cuando trabajes en este codebase utilizando tu entorno MCP o herramientas de análisis de código, asegúrate de:

*   **Consultar el Codebase-Memory local:** Utiliza el grafo de conocimiento local generado por `codebase-memory-mcp` para resolver qué funciones llaman a un servicio o cómo interactúa el contrato `BlindBidVault` con el scoring de IA antes de escribir código redundante.
*   **Consumir Context7 para Librerías Web3:** Siempre que vayas a integrar Hooks de Wagmi, interactuar con el ABI en Next.js o configurar llamadas de Ethers.js, solicita la documentación en tiempo real mediante `Context7` utilizando la instrucción `use context7` para evitar APIs obsoletas de versiones previas.
*   **Testeo de Invariantes (Fuzz Testing):** Al generar o modificar las pruebas unitarias y de integración del backend, diseña casos límite y pruebas aleatorias (emulando las pruebas de estrés *fuzzing* de Forge en Foundry) para asegurar que el cálculo de scoring compuesto (precio + `aiScore`) y la distribución de USDC nunca comprometan la inmutabilidad de la tesorería.

---
*Documento de trabajo para el equipo de desarrollo de LicitaBien — Hackathon ETH Lima 2026.*
