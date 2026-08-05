Hoja de ruta del desarrollo del proyecto:

Leyenda: **Negrita**: puntos importantes/pasos, Resaltado amarillo: completado

- **Crear el github donde vamos a guardar el proyecto \[LISTO\]**  
- **Evaluar las reglas obligatorias implicadas en el core del proyecto**  
  - Estar desplegados en una **red compatible con Arbitrum** (por ejemplo, Arbitrum One, Arbitrum Sepolia u otra cadena del ecosistema Arbitrum habilitada por la organización).  
  - Contar con al menos un smart contract desplegado y funcional.  
  - Presentar una aplicación funcional (MVP) que permita demostrar el caso de uso.  
  - Entregar toda la documentación solicitada antes de la fecha límite.  
  - Aplicación útil de blockchain  
- **Investigar problemáticas**   
  - Buscar problemas en el contexto peruano con datos cuantificables que demuestren que es una situación que requiere una solución.  
- **Definir el problema con los datos encontrados**  
- **Plantear la solución que responda lo siguiente:**  
  - Es útil aplicar Blockchain y Arbitrum en esta solución?  
- **Validar con [crítica brutal de IA](https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/03-ia-para-hackathons/prompts/critica-brutal-idea.md). Matar o seguir.**   
  - Prompt: [https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/03-ia-para-hackathons/prompts/critica-brutal-idea.md](https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/03-ia-para-hackathons/prompts/critica-brutal-idea.md)  
- **Definir el MVP mínimo demostrable (1 flujo, no 5\)**  
- **Repartir roles. Setup de repo, entorno, testnet.**   
- **Planificar Arquitectura**  
  - Requisitos de la dApp:  
    - Funcionales  
    - No Funcionales  
    - Regulatorios  
  - Especificación de comportamiento   
    - Definición del proceso   
    - Los estados posibles  
    - Transición de estados  
  - Invariantes  
    - Qué situaciones nunca deberían pasar o deberían comprobarse  
  - Criterios   
    - ¿Cómo valido que lo que he hecho está bien?  
- **Desarrollo \+ IA \+ Documentación**   
  - Camino feliz ("happy path") del MVP. Que una cosa funcione de punta a punta.  
  - 20–24	Primer demo interno feo pero funcional. Si no hay demo aquí, hay problema de scope.  
  - 24–36	Pulir el flujo demostrable. Conectar contrato ↔ frontend.  
  - 36–44	Congelar features (feature freeze). Solo bugs del camino de la demo.  
  - 44–48	Deploy final estable. Grabar demo de respaldo (video).  
- **Preparación de pitch**  
  - Escribir el guion del pitch (estructura: https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/05-demo-y-pitch/estructura-pitch.md).  
  - 52–56	Hacer las slides (plantilla: https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/plantillas/pitch-deck.md). Menos texto, más impacto.  
  - 56–60	Grabar demo de respaldo en video (seguro anti-desastres en vivo).  
  - 60–66	Ensayar el pitch en voz alta, cronometrado, 5+ veces.  
  - 66–70	Practicar preguntas del jurado. (prompt Q\&A: https://github.com/IanHerez/ETHLima-ComoGanarHackathonWeb3/blob/main/03-ia-para-hackathons/prompts/practicar-preguntas-jurado.md)  
  - 70–72	Enviar submission (repo, video, descripción, tracks). Dormir algo.  
- **Checklist antes de enviar:**  
  - Antes de enviar (submission checklist)  
  -  Repo público con README claro (qué es, cómo correr, qué track).  
  -  Video demo de 2–3 min subido y con enlace válido.  
  -  Contrato desplegado en testnet con dirección visible.  
  -  Tracks/sponsors correctamente seleccionados en la plataforma.  
  -  Descripción del proyecto con el problema en la primera línea.  
  -  Equipo y roles listados.

# **InvoiceShield: Protocolo Criptográfico de Coordinación y Prevención de Fraude en Factoring B2B**

---

## **1\. Definición del Producto y Visión del Proyecto**

**InvoiceShield** es un protocolo de infraestructura y seguridad financiera descentralizada diseñado para bancos y empresas medianas de factoring en el Perú. Funciona como una capa de coordinación y alertas criptográficas en tiempo real en la red Arbitrum. El sistema permite a las entidades financieras rivales compartir un registro inmutable y anónimo de facturas financiadas para evitar fraudes, sin vulnerar el secreto bancario ni revelar información comercial sensible a sus competidores.

---

## **2\. El Dolor Real en el Mercado Peruano (El "Y Qué")**

El mercado peruano presenta una rápida adopción de pagos digitales, pero sufre graves fricciones en los procesos que ocurren después del pago: cumplimiento, conciliación, garantías y coordinación multiparte. En el sector del factoring, existen dos problemas críticos:

* **El Fraude por Doble Financiamiento:** Debido a que las empresas de factoring son competidoras directas, no comparten sus bases de datos internas. Una MYPE maliciosa puede presentar el mismo XML de factura a múltiples plataformas de factoring en paralelo. Como los sistemas de registro tradicionales (como CAVALI) tienen ventanas de actualización que toman horas o días, el estafador puede recibir el dinero varias veces antes de que se detecte la duplicidad.  
* **La Ventana de Disconformidad de 8 Días:** Según las normas de la SUNAT, las empresas compradoras (los deudores de las facturas) tienen un plazo de 8 días calendario para reclamar disconformidades sobre facturas mal digitadas o problemas con la entrega de bienes. Si una financiera adelanta fondos a la MYPE en el día 2, y en el día 5 el comprador registra una disconformidad en SUNAT, la factura pierde su calidad de título valor negociable, dejando a la financiera con una deuda incobrable.

---

## **3\. El "Test Web3" de InvoiceShield (Por qué Blockchain y no Postgres)**

Un jurado técnico de hackathon planteará de inmediato la pregunta destructiva: *«¿Por qué no hacen esto con una base de datos centralizada tradicional?»*. **InvoiceShield** se defiende bajo tres pilares tecnológicos Web3:

1. **Consenso sin Confianza (Trustless):** Los bancos y las empresas de factoring son competidores feroces. Ninguno aceptará jamás centralizar la información de su cartera de clientes, RUCs o montos facturados en un servidor controlado por un tercero o por un competidor. Con un contrato inteligente en Arbitrum, no existe un administrador central que sea dueño de los datos.  
2. **Privacidad mediante Criptografía de Hashing:** En lugar de subir datos legibles a la blockchain, el sistema procesa la validación mediante hashes criptográficos irreversibles off-chain / on-chain. El frontend de la financiera calcula el hash único del archivo XML de la factura: $$\\text{Keccak256(RUC\_Emisor \+ RUC\_Receptor \+ Numero\_Factura \+ Monto)}$$ Este hash incomprensible se registra en el contrato inteligente. Dos financieras que procesen la misma factura generarán exactamente el mismo hash matemático, lo que permite detectar la duplicidad al instante on-chain sin revelar quién es el cliente, cuál es el monto ni qué deudor está involucrado.  
3. **Capa de Coordinación y no Base de Verdad Legal:** El proyecto es técnicamente defendible porque **no pretende reemplazar la validez fiduciaria de CAVALI o la SUNAT.** El token o hash en el contrato no otorga el derecho de cobro legal (el cual sigue residiendo en CAVALI y en los contratos off-chain). En su lugar, actúa exclusivamente como un **protocolo de alerta y coordinación de financiamientos.**

---

## **4\. Flujo de Integración y Adaptadores (SUNAT & CAVALI)**

Para que el MVP sea realista y ejecutable, el sistema implementa **adaptadores (oráculos/puentes)** que sincronizan eventos críticos del mundo real con el Smart Contract:

  \[ MYPE \] \---\> Sube XML \---\> \[ Frontend Financiera \] \---\> Genera Hash

                                                                  |

                                                                  v

\[ Contrato Inteligente \] \<--- Condiciona Financiamiento \<--- \[ Smart Contract \]

  (Bloquea o Libera)                                              ^

         ^                                                        |

         |=== \[ Adaptador SUNAT \] (Verifica Conformidad 8 días) \==|

         |                                                        |

         |=== \[ Adaptador CAVALI \] (Verifica Anotación Factrack) \=|

1. **Ingreso y Hashing:** El sistema extrae los metadatos mínimos del XML e inscribe su hash en el Smart Contract. El estado inicial es `Pending`.  
2. **Adaptador SUNAT:** Un adaptador simulado monitorea el portal de la SUNAT. El comprador deudor registra la conformidad en el sistema fiscal. El adaptador detecta la conformidad y firma digitalmente la actualización on-chain.  
3. **Adaptador CAVALI:** Otro adaptador simulado monitorea Factrack de CAVALI. Una vez confirmada la anotación en cuenta (que otorga el título valor legal), el adaptador firma la transacción.  
4. **Liberación de Fondos:** Sólo cuando ambas firmas de los adaptadores se registran, el Smart Contract cambia su estado a `Validated` y habilita la liberación automática de los fondos en custodia hacia la MYPE.  
5. **Detección de Anomalías Post-Firme:** Si posteriormente la SUNAT registra una **nota de crédito** o el comprador ingresa una disconformidad de última hora, el adaptador de SUNAT detecta la inconsistencia y **el Smart Contract bloquea de inmediato cualquier desembolso futuro** o transferencia de este colateral.

---

## **5\. Viabilidad Comercial y Regulatoria (A Prueba de Balas)**

* **Libre de Trabas de la SBS / SMV:** Las plataformas P2P que captan fondos directamente de inversionistas minoristas para financiar carteras entran bajo supervisión regulatoria estricta de la SMV (financiamiento participativo) y de la SBS (operaciones de crédito/arrendamiento). **InvoiceShield no capta fondos del público ni realiza intermediación financiera.** Es una **herramienta de software criptográfico B2B (SaaS)** que se vende a los bancos y factoring bajo suscripción para mitigar sus pérdidas por fraudes operativos.  
* **Modelo de Negocio Directo (B2B):** El cliente pagador es la entidad financiera (bancos o empresas de factoring privadas). Ellos tienen presupuesto tecnológico y un incentivo económico directo: el costo de la suscripción anual al consorcio de InvoiceShield es infinitamente menor que los millones de soles que pierden anualmente por estafas de doble venta de facturas.  
* **Abstracción Total de Complejidad Web3:** Las MYPEs que emiten facturas no necesitan crear wallets, comprar gas ni interactuar con Arbitrum. Ellas siguen usando el portal de la financiera tradicional como siempre. Es el backend de la entidad financiera el que interactúa criptográficamente con el Smart Contract, patrocinando el gas mediante el uso de cuentas inteligentes y paymasters.

---

## **6\. El Guión de la Demo Ganadora (Paso a Paso en Vivo)**

La demo debe estar diseñada para impactar al jurado técnico y de negocio en menos de 3 minutos, usando dos ventanas de navegador en paralelo:

1. **Paso 1: Registro Inicial (Factor A)**  
   * *Acción:* En la pantalla izquierda, entras como el analista de riesgos de "Factoring Continental" (Factor A). Subes un archivo XML de prueba.  
   * *Efecto:* El sistema calcula el hash `0x7a8b...` en vivo y envía la transacción a la testnet de Arbitrum. El dashboard muestra la factura registrada como `Pending`.  
2. **Paso 2: Simulación de los Oráculos**  
   * *Acción:* Se activa el temporizador del demo (por ejemplo, 30 segundos). El adaptador simulado de SUNAT valida la conformidad del deudor y el adaptador de CAVALI confirma el Factrack.  
   * *Efecto:* Las luces del frontend cambian a verde. El contrato inteligente en Arbitrum cambia el estado a `Validated`. Se muestra cómo se aprueba la orden de desembolso.  
3. **Paso 3: Bloqueo del Intento de Fraude (Factor B)**  
   * *Acción:* En la pantalla derecha, entras como el analista de riesgos de "Factoring del Perú" (Factor B). Simulas que el mismo cliente malicioso intenta subir **exactamente el mismo XML** para conseguir una segunda línea de crédito en tu plataforma.  
   * *Efecto:* El frontend de Factor B calcula el hash, ejecuta la consulta on-chain y **la transacción de registro es rechazada de inmediato (`revert`) en vivo.**  
   * *El Momento Clímax:* La pantalla de Factor B emite una alerta roja gigante en pantalla: `[FRAUDE DETECTADO]: El hash de esta factura ya fue financiado por Factoring Continental hace 45 segundos. Operación cancelada.`.  
4. **Paso 4: El Bloqueo de Nota de Crédito**  
   * *Acción:* En la consola, ejecutas un trigger de "Nota de Crédito SUNAT emitida con posterioridad" para la factura ya financiada por Factor A.  
   * *Efecto:* El adaptador reacciona y actualiza de inmediato el contrato inteligente al estado `Blocked`. El sistema de Factor A inhabilita cualquier retiro de fondos residuales automáticamente en su dashboard.

---

🔍 **Sugerencia de Siguiente Paso:** ¿Quieres que preparemos los scripts para compilar este Smart Contract de InvoiceShield en Foundry y simular las llamadas de los adaptadores de SUNAT y CAVALI utilizando pruebas locales antes de desplegar en Arbitrum Sepolia?

