# 🛡️ InvoiceShield — AGENTS.md
### El "Brain-Context" para Agentes de IA en el Repositorio de InvoiceShield

Este archivo sirve como la **especificación técnica unificada, mapa de arquitectura y manual de instrucciones** para cualquier Agente de IA que colabore en este codebase.

---

## 🌌 Visión y Contexto del Negocio (RWA + DeFi + IA)

**InvoiceShield** es un protocolo descentralizado de finanzas regenerativas (ReFi) y tokenización de activos del mundo real (RWA) sobre **Arbitrum Sepolia**, diseñado para mitigar las fricciones de factoring para las MYPES del Perú:
1.  **Fraude por Doble Financiación:** Evita que una misma factura XML sea financiada en múltiples entidades mediante huellas inmutables on-chain (`keccak256`).
2.  **Riesgo de Oráculo y Facturas Fantasma:** Blindaje mediante firmas multisello y adaptadores simulados (SUNAT & CAVALI) conectados a bases de datos de confianza y estructurados para integración futura con oráculos reales.

### Flujo de Coordinación Financiera
1. **Ingesta de Facturas:** Subida de factura XML original.
2. **Cálculo de Hash:** Generación de clave criptográfica primaria en el backend.
3. **Auditoría de Riesgo por IA:** Análisis con OpenRouter / Llama 3.1 Nemotron.
4. **Escrow Condicionado:** Retención de USDC en pool de liquidez (*Lending Vault*).
5. **Liberación por Adaptadores:** Desembolso condicionado a validaciones legales (SUNAT/CAVALI).
6. **Recuperación Jurídica:** Emisión de NFT de Deuda Activa en caso de impago y subasta vía `BlindBidVault`.

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
6. **Cálculo de Hash en Servidor:** Nunca confiar en hashes enviados por el cliente.
7. **Aislamiento de Oráculos:** Abstracción mediante interfaces de adaptadores.


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

InvoiceShield es un MVP para una hackathon.

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
- [ ] Contratos
- [ ] Tests

Fase 3
- [ ] Backend

Fase 4
- [ ] Frontend

Fase 5
- [ ] Demo


## 🤖 Directrices de Comportamiento para Agentes de IA

Cuando trabajes en este codebase utilizando tu entorno MCP o herramientas de análisis de código, asegúrate de:

*   **Consultar el Codebase-Memory local:** Utiliza el grafo de conocimiento local generado por `codebase-memory-mcp` para resolver qué funciones llaman a un servicio o cómo interactúa el contrato inteligente de factoring con el pool antes de escribir código redundante.
*   **Consumir Context7 para Librerías Web3:** Siempre que vayas a integrar Hooks de Wagmi, interactuar con el ABI en Next.js o configurar llamadas de Ethers.js, solicita la documentación en tiempo real mediante `Context7` utilizando la instrucción `use context7` para evitar APIs obsoletas de versiones previas.
*   **Testeo de Invariantes (Fuzz Testing):** Al generar o modificar las pruebas unitarias y de integración del backend, diseña casos límite y pruebas aleatorias (emulando las pruebas de estrés *fuzzing* de Forge en Foundry) para asegurar que el cálculo de tasas y distribución de USDC nunca comprometa la inmutabilidad de la tesorería.

---
*Documento de trabajo para el equipo de desarrollo de InvoiceShield — Hackathon ETH Lima 2026.* [77]
