# Educai · Decisiones del MVP demostrable

**Fecha:** 5 de octubre de 2026
**Alcance:** MVP para una demo de 10 a 15 minutos frente a una docente, construido sobre los documentos canónicos de `docs/`.

Este documento registra dónde la implementación se aparta de la especificación y por qué. Si algo no figura acá, la intención es seguir el documento canónico correspondiente.

---

## 1. Qué se respetó sin cambios

- **Lineage completo.** Cada acción del estudiante recorre `SourceArtifact → RawInteraction → Opportunity → EvidenceEvent → EvidenceSignal → CapabilityInterpretation → Recommendation`, con una tabla por capa y referencias entre ellas. Ninguna capa se reemplaza por una salida de LLM.
- **Aislamiento académico.** Toda query de evidencia, interpretación y recomendación filtra por `course_section_id`. El perfil global solo aporta contexto de presentación.
- **Privacidad docente en el backend.** Los servicios docentes leen de la proyección agregada (tablas sin `student_user_id`) y aplican `MIN_AGGREGATE_CELL_SIZE = 5` antes de serializar. Un test de contrato serializa todos los DTOs docentes del escenario y verifica que no aparezca ningún id, nombre ni email de estudiante.
- **Declarado no es observado.** Las preguntas del estudiante, las respuestas de la IA, el tiempo en tarea y los intereses no generan señales de capacidad.
- **Borrado con propagación.** Eliminar una fuente invalida sus eventos y señales, y recalcula interpretación, recomendaciones y proyección docente.
- **Motores deterministas con parámetros versionados** (`ENGINE_PARAMS`, `engine_version`) y golden tests sobre los casos de las specs.

## 2. Desvíos de arquitectura

| Especificación | MVP | Motivo |
|---|---|---|
| Monorepo con API y workers separados, cola (BullMQ), almacenamiento de objetos | Una sola app Next.js (web + API) con módulos por bounded context en `src/modules/*` | TA admite una arquitectura TypeScript modular equivalente. Para una demo, un proceso simplifica la instalación a `pnpm install && pnpm dev`. |
| Jobs asíncronos encadenados por eventos | La cadena evidencia → interpretación → recomendación → proyección corre en proceso y de forma síncrona (`src/modules/pipeline.ts`) | Mitigación R6 de TA ("feedback determinista síncrono cuando sea posible"). El estudiante ve su cambio de estado al terminar la actividad. `outbox_events` queda como log auditable, sin consumidores. |
| PostgreSQL gestionado | PGlite embebido por defecto; `DATABASE_URL` activa `node-postgres` | Mismo schema y mismas migraciones. Evita depender de Docker para la demo. |
| Experiencias generadas como código en un origen aislado | Solo experiencias declarativas (`decision_scenario` v1, JSON validado con zod) que renderiza un shell confiable | TA:3534 y TA:3816-3830 habilitan este formato como primero. Sin código generado no hace falta el origen aislado; el contrato de eventos y los quality gates se aplican igual. |
| SSE para el tablero en vivo | Polling cada 2,5 s | Suficiente para una clase y más simple de operar. |
| Autenticación institucional | Login demo con usuarios precargados y cookie firmada con HMAC | La autorización (rol + ABAC por cátedra) sí está en el backend. Un docente de otra cátedra recibe 404. |
| Archivos de programa en almacenamiento de objetos | Se guarda el texto extraído y la metadata del archivo en `materials` | No hay almacenamiento de objetos en el MVP. |

## 3. Extensiones al modelo de datos

Todas viven en la misma migración inicial (`src/db/migrations/0000_init.sql`). A partir de este punto las migraciones deben ser incrementales.

- `capabilities.known_error_types` (`[{ key, label, description, studentLabel? }]`): catálogo de errores frecuentes que las experiencias instrumentadas declaran (C:762-773). `label` se usa en vistas docentes y `studentLabel` en segunda persona para el estudiante.
- `capabilities.planned_class_no` y `capabilities.keywords`: cronograma y detección de temas en conversaciones importadas.
- `curriculum_versions.draft` y `curriculum_versions.extractor`: la propuesta editable de "Así entendimos tu materia" antes de activarla, y si salió del extractor con IA o del heurístico.
- `recommendations.rank`: orden entre las recomendaciones activas de un estudiante.
- `experience_sessions.state`, `result` e `is_simulated`: estado del player para retomar, feedback final y marca de sesiones del modo demo.
- `launches.baseline`: foto de la proyección al abrir un lanzamiento, para el "antes y después".

## 4. Decisiones de motor

- **Umbral de hallazgo docente.** Además de n ≥ 5, un hallazgo de tipo "necesita revisar" exige una tasa de al menos 25 % (`minReviewRateForFinding`). Sin ese piso, el inicio docente mostraba como prioridad capacidades con 1 de cada 5 estudiantes en revisión, lo que diluía el hallazgo principal.
- **Resolución de un patrón de error.** Las evidencias de apoyo que cuentan para resolver un error tienen que estar al nivel cognitivo objetivo de la capacidad. Explicar bien un concepto después de haber fallado al aplicarlo no resuelve el error de aplicación (golden test "explicar bien después del error no lo resuelve").
- **Inconsistencias entre specs.** Para el enum de estado visible (`unknown`, `in_development`, `solid`, `needs_review`) y para los niveles cognitivos (`solve` en lugar de `resolve`) se tomó la versión del Data Model y de la Interpretation spec, que son las más específicas.
- **Orden de opciones.** El player mezcla las opciones de forma determinista por escenario, para que la opción correcta no quede siempre primera. El seed conserva el orden del banco porque sus respuestas guionadas dependen de él.

## 5. IA

- **Un solo proveedor** a través de `src/modules/ai-gateway/gateway.ts`. El modelo se configura con `EDUCAI_MODEL`.
- **Tareas:** evaluación de explicaciones (tutor e importación), generación de situaciones de decisión, extracción curricular desde el programa y conversación del tutor en modo aprendizaje (streaming).
- Cada tarea declara `task` y `promptVersion`, valida la salida estructurada con zod y registra latencia, tokens, costo estimado y uso de fallback en `ai_calls`.
- **Fallback de seguridad del proveedor.** Las llamadas habilitan el reintento del lado del servidor con un modelo de respaldo cuando el modelo principal declina responder.
- **Sin `ANTHROPIC_API_KEY`** (o con `EDUCAI_AI=off`) cada tarea cae a un fallback determinista:

  | Tarea | Fallback |
  |---|---|
  | Evaluar explicaciones | Rúbrica por palabras clave y detección de confusiones de rol |
  | Tutor | Guiones preparados por capacidad |
  | Generar experiencias | Banco curado de 26 situaciones |
  | Extraer currícula | Parser heurístico de encabezados y listas |

  La demo completa funciona en este modo. Lo único que requiere IA es generar experiencias para capacidades sin banco curado, y la UI lo avisa antes de ofrecer el botón.

- **Pendiente:** el set de eval cases por tarea que pide AGENTS.md. Los tests actuales cubren los fallbacks y la validación de schema, pero no la calidad de las salidas del modelo.

## 6. Modo demo

Con `DEMO_MODE=true`:

- **"Reiniciar demo"** (en `/entrar` o con `pnpm db:reset`) vacía la base y recrea el escenario.
- **"Simular participación del aula"** hace que hasta 26 estudiantes sintéticos respondan la experiencia abierta.
  - Cada respuesta pasa por la misma API de runtime y el mismo pipeline que la de un estudiante real.
  - Las sesiones quedan marcadas con `is_simulated`.
  - La probabilidad de acierto depende del estado actual de cada estudiante, de modo que el resultado agregado sale de los motores y no de un número fijo.
  - Las semillas del generador pseudoaleatorio son estables (email del estudiante sintético y escenarios de la experiencia). Después de "Reiniciar demo", el mismo recorrido da siempre el mismo resultado, y un test lo fija.

El seed también recorre el pipeline real: escribe runtime events, actividades y explicaciones, y deja que los motores calculen los estados. Un test de contrato fija los números que resultan (por ejemplo 12 de 27, 44 %, en Product Owner vs. Scrum Master).

## 7. Fuera de alcance

Quedaron fuera:

- onboarding de autodescubrimiento;
- proyectos personales;
- panel institucional;
- asistente docente conversacional;
- cierre de clase con feedback;
- integraciones con LMS;
- notificaciones;
- apps nativas;
- experiencias 3D o de código generado.

El perfil global del estudiante y el resumen de feedback de clase se precargan en el seed.
