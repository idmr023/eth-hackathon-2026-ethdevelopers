# 🛡️ InvoiceShield — AGENTS.md
### El "Brain-Context" para Agentes de IA en el Repositorio de InvoiceShield

Este archivo sirve como la **especificación técnica unificada, mapa de arquitectura y manual de instrucciones** para cualquier Agente de IA (Cursor, Claude Code, etc.) que colabore en este codebase. Al leer este archivo, el agente comprenderá el modelo de negocio, las restricciones criptográficas, la teoría de juegos del protocolo y las convenciones exactas del desarrollo.

---

## 🌌 Visión y Contexto del Negocio (RWA + DeFi + IA)

**InvoiceShield** es un protocolo descentralizado de finanzas regenerativas (ReFi) y tokenización de activos del mundo real (RWA) sobre **Arbitrum**, diseñado específicamente para mitigar las dos fricciones financieras más críticas en el factoring de las Micro y Pequeñas Empresas (MYPES) en el Perú [12, 13, 203]:
1.  **El Fraude por Doble Financiación:** Evitar que una misma factura XML sea registrada y financiada en múltiples entidades tradicionales en tiempo real mediante un registro inmutable on-chain [8].
2.  **El Riesgo de Oráculo y Fraude de Facturas Fantasma:** Mitigar el riesgo comercial blindando el flujo mediante firmas multisello de enemigos y simulando adaptadores oráculo off-chain vinculados a bases de datos de confianza [3, 9, 41, 42].

### El Flujo de Coordinación Financiera (On-Chain / Off-Chain)

1.  **La Ingesta de Facturas (XML de SUNAT):** La MYPE sube la factura electrónica en formato XML original [8]. El frontend no calcula la huella final para decisiones críticas; la envía de manera segura al backend (NestJS) [Reglas globales].
2.  **Cálculo de la Huella Criptográfica:** El backend procesa el XML, valida la autenticidad y calcula un hash `Keccak256(ruc_emisor + ruc_receptor + numero_factura + monto)` [8, 96]. Este hash actúa como la clave primaria del activo en la blockchain.
3.  **Auditoría de Riesgo por IA (OpenRouter + Nemotron):** El backend envía el contenido XML a la API de **OpenRouter** consumiendo el modelo gratuito `llama-3.1-nemotron-70b-instruct:free` para buscar anomalías de negocio (incoherencias de montos, fechas de vencimiento ilógicas) [708].
4.  **Escrow Condicionado de Fondos (DeFi Liquidity Pools):** Los inversionistas globales aportan USDC a un pool de liquidez (*Lending Vault*) [22, 23, 203]. Al aprobarse el análisis crediticio por IA, los fondos requeridos quedan retenidos en un contrato de *Escrow* (fideicomiso) [9, 22].
5.  **Liberación por Adaptadores (SUNAT & CAVALI):** El *Escrow* on-chain mantiene el dinero en custodia inmutable y **solo libera el capital** al proveedor cuando los adaptadores simulan recibir luz verde de los sistemas legales peruanos [9, 22, 23]:
    *   **Conformidad SUNAT:** Validación de conformidad de 8 días de la factura sin notas de crédito posteriores [22].
    *   **Anotación CAVALI:** Verificación en Factrack de que la factura ya es un título valor legalmente transmisible [7, 22].
6.  **Recuperación Jurídica en Incumplimiento (NFT de Deuda Activa):** Si el deudor entra en impago (*Default*) al vencimiento del plazo, el Smart Contract emite un **NFT de Deuda Activa** [23, 203]. Este NFT representa el derecho legal de cobro originado off-chain y puede ser subastado con descuento a empresas de cobranza tradicionales de forma transparente [22, 23].

---

## 🛠️ Comandos de Ejecución Rápida

Para iniciar el desarrollo, testear e integrar de forma local, utiliza los siguientes comandos estándar. **Los agentes de IA deben respetar estrictamente este esquema de ejecución en monorrepo:**

### 🖥️ Backend (NestJS + Prisma + Neon PostgreSQL)
```bash
# Cambiar al directorio del backend
cd backend

# Levantar entorno de desarrollo con recarga en vivo
npm run dev

# Ejecutar las pruebas unitarias y de integración
npm run test

# Correr el linter estricto de TypeScript (ESLint 9)
npm run lint

# Validar tipado sin compilar (Tolerancia cero a errores)
npm run typecheck

# Generar y aplicar migraciones de base de datos
npx prisma migrate dev

# Poblado de base de datos con mock data para testing
npx prisma db seed
```

### 🎨 Frontend (Next.js App Router + TailwindCSS + Wagmi/RainbowKit)
```bash
# Cambiar al directorio del frontend
cd frontend

# Levantar el servidor de desarrollo local
npm run dev

# Ejecutar pruebas unitarias de componentes
npm run test

# Verificar cumplimiento de reglas estéticas y de sintaxis
npm run lint

# Validar tipado de Next.js
npm run typecheck
```

---

## 📋 Reglas Globales de Desarrollo y Seguridad

Cualquier agente de IA que genere o refactorice código en este repositorio debe respetar **8 mandamientos inquebrantables**:

1.  **Cero Hardcoding de Secretos:** Jamás versionar archivos `.env`, `.env.local` ni claves de API en GitHub. Solo se permite versionar esquemas de variables en `.env.example`.
2.  **Inmutabilidad de Auditoría (WORM):** El log de transacciones y auditoría física `audit_logs` utiliza el patrón *Write Once, Read Many* (WORM). Los triggers y las restricciones de la base de datos bloquean cualquier sentencia directa de `UPDATE` o `DELETE`.
3.  **Autoridad Central en Backend:** El frontend es solo un visualizador dinámico con filtros de interfaz de usuario [Reglas globales]. La lógica de validación de negocio, cálculo de tasas, verificación de roles y autorización reside de forma estricta y exclusiva en el backend de NestJS.
4.  **Calidad en Integración Continua (CI):** No se aprueba ningún pull request si existen alertas de ESLint, errores en `typecheck` o pruebas que fallen en la terminal. **La deuda técnica tiene un costo inaceptable.**
5.  **Formato de Respuesta de API Estándar:** Todas las APIs deben retornar el formato JSON estricto: `{ ok: boolean, data: any, total?: number }`. Los errores deben utilizar los códigos de catálogo preestablecidos para mapear el origen exacto del fallo.
6.  **Documentación Continua en Changelog:** Toda funcionalidad integrada bajo una fase debe ser documentada de inmediato en `/docs/CHANGELOG.md` referenciando el identificador descriptivo correspondiente (e.g. `[fase.1.ingesta]`).
7.  **Cálculo de Hash del Lado del Servidor:** Jamás se debe confiar en el hash Keccak256 enviado por el cliente para almacenar el activo en Arbitrum Sepolia [Reglas globales]. El backend debe recalcularlo y verificarlo contra el XML original de SUNAT.
8.  **Aislamiento de Interfaces de Oráculo:** Los adaptadores que simulan SUNAT y CAVALI deben estar encapsulados bajo una abstracción clara de interfaces (`AdapterService`) de NestJS [Reglas globales]. Esto permite que el sistema simule las aprobaciones lógicas con mockups hoy, pero sea 100% reemplazable por integraciones API reales u oráculos (Chainlink/API3) mañana [88, 296].

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
