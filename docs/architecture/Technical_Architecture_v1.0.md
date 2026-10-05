# Educai — Technical Architecture

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo de documento:** Technical Architecture + Engineering Specification  
**Estado:** Arquitectura de referencia para implementación  
**Dependencias:** PRD Maestro v1.0 + Modelo Curricular v1 + Evidence Engine v1 + Interpretation Engine v1 + Recommendation Engine v1 + Experience Engine / Runtime v1  

---

# 0. Resumen ejecutivo

La arquitectura técnica de Educai debe sostener una propiedad central del producto:

> **cada interacción educativa útil puede transformarse en evidencia trazable, esa evidencia puede reinterpretarse de manera reproducible y el resultado puede producir una próxima decisión pedagógica sin romper privacidad, aislamiento por cátedra ni autonomía del usuario.**

La arquitectura propuesta para v1 es deliberadamente **modular, event-driven y no microservicios-first**.

Educai debería comenzar como un **modular monolith con workers asíncronos y un Runtime de Experiencias aislado**, porque el principal riesgo del producto no es todavía la escala horizontal extrema sino la consistencia entre dominios complejos:

- currícula;
- evidencia;
- interpretación;
- recomendación;
- experiencias;
- perfil global;
- privacidad;
- IA.

La separación lógica entre estos dominios debe existir desde el primer día, pero no es necesario convertir cada dominio en un servicio desplegable independiente antes de validar el producto.

Arquitectura recomendada:

```text
                         ┌───────────────────────┐
                         │   WEB APP EDUCAI      │
                         │ Student / Teacher     │
                         └───────────┬───────────┘
                                     │ HTTPS / SSE
                                     ↓
┌────────────────────────────────────────────────────────────────────┐
│                       EDUCAI APPLICATION API                        │
│                                                                    │
│ Identity / Enrollment / Curriculum / Student Profile / Projects    │
│ AI Chat / Evidence / Interpretation / Recommendation / Teacher UX  │
└───────────┬────────────────────┬──────────────────────┬────────────┘
            │                    │                      │
            │                    │ transactional        │ object
            │                    │ outbox / jobs        │ storage
            ↓                    ↓                      ↓
   ┌────────────────┐   ┌─────────────────┐   ┌─────────────────┐
   │ PostgreSQL     │   │ Job Workers     │   │ S3-compatible   │
   │ + pgvector     │   │ + Queue         │   │ Object Storage  │
   └────────────────┘   └───────┬─────────┘   └─────────────────┘
                                │
               ┌────────────────┼──────────────────┐
               ↓                ↓                  ↓
        Evidence Jobs    Interpretation Jobs   Recommendation Jobs
                                │
                                ↓
                       Experience Generation
                                │
                                ↓
                  ┌──────────────────────────┐
                  │ ISOLATED BUILD PIPELINE  │
                  │ Claude Code / Codex      │
                  │ tests + sandbox + build  │
                  └────────────┬─────────────┘
                               ↓
                     Immutable Experience Bundle
                               ↓
                  ┌──────────────────────────┐
                  │ EXPERIENCE RUNTIME       │
                  │ separate origin / iframe│
                  │ restricted SDK bridge   │
                  └────────────┬─────────────┘
                               ↓ events
                       Evidence ingestion
```

La fuente de verdad principal es **PostgreSQL**. Los archivos y bundles viven en **object storage**. La recuperación semántica puede comenzar con **pgvector** dentro de PostgreSQL. Los trabajos asíncronos utilizan una cola y workers. Las experiencias generadas se compilan como artefactos inmutables y se ejecutan en un origen aislado sin acceso directo a base de datos, secretos o red arbitraria.

La arquitectura evita tres errores frecuentes:

1. **microservicios prematuros**, que aumentarían complejidad operativa antes de validar el producto;
2. **LLM como autoridad estructural**, dejando que modelos decidan permisos, thresholds o transiciones críticas;
3. **código generado ejecutándose con privilegios de la aplicación**, que convertiría el Runtime de Experiencias en una superficie de riesgo crítica.

---

# 1. Objetivos de arquitectura

La Technical Architecture debe permitir:

1. construir panel estudiante y panel docente completos;
2. mantener un perfil global del estudiante y aprendizaje aislado por cátedra;
3. ingerir conversaciones internas y archivos `.txt/.md` externos;
4. procesar evidencia con lineage completo;
5. recalcular interpretaciones cuando cambia la evidencia o una versión del motor;
6. invalidar y regenerar recomendaciones;
7. generar experiencias digitales con Claude Code/Codex sin otorgarles acceso privilegiado;
8. ejecutar experiencias interactivas con persistencia, pausa, reanudación y eventos confiables;
9. ofrecer feedback de baja latencia cuando corresponde;
10. preservar anonimato docente por arquitectura, no solo por UI;
11. soportar eliminación de fuentes y recálculo derivado;
12. versionar currícula, prompts, motores, experiencias y schemas;
13. medir producto y calidad del sistema desde el primer piloto;
14. escalar gradualmente sin reescribir los contratos centrales.

---

# 2. No objetivos arquitectónicos de v1

No es objetivo de v1:

- diseñar una arquitectura multi-región activa-activa;
- separar cada dominio en microservicios independientes;
- construir un data warehouse complejo antes del piloto;
- permitir que experiencias generadas ejecuten backend arbitrario;
- exponer una API pública general a terceros;
- soportar plugins de código no confiable fuera del Runtime controlado;
- construir un sistema LMS completo;
- construir causal inference institucional automática;
- optimizar para millones de usuarios antes de validar comportamiento real.

---

# 3. Principios técnicos

## 3.1. Modular monolith first

Una sola aplicación backend puede contener módulos separados con contratos explícitos.

Beneficios:

- transacciones simples;
- menor latencia inter-servicio;
- migraciones coordinadas;
- debugging más sencillo;
- menor carga DevOps;
- mejor velocidad para un equipo pequeño asistido por agentes de programación.

Cada módulo debe evitar acceder directamente a las tablas internas de otro módulo cuando existe un contrato de dominio.

La separación de despliegue llegará únicamente cuando existan razones medibles:

- escala distinta;
- aislamiento de seguridad;
- independencia de release;
- cargas computacionales incompatibles;
- ownership de equipo.

El **Experience Build System** sí se separa desde v1 porque ejecuta código generado y requiere límites de seguridad diferentes.

---

## 3.2. PostgreSQL como source of truth

Los estados académicos, inscripciones, currícula, recommendations, sessions, lineage y permisos deben tener una fuente transaccional común.

No introducir múltiples bases especializadas si PostgreSQL puede resolver el problema con seguridad.

---

## 3.3. Async where useful, sync where necessary

Operaciones que requieren consistencia inmediata:

- autenticación;
- permisos;
- enrollment;
- crear una sesión;
- persistir una respuesta;
- guardar el estado de Runtime;
- publicar una experiencia;
- eliminar una fuente.

Operaciones que pueden ser eventuales:

- extracción semántica de evidencia;
- re-interpretación;
- regeneración de recomendaciones;
- embeddings;
- procesamiento de documentos;
- analytics;
- generación de experiencias.

---

## 3.4. LLM semantic, code structural

Los modelos de IA pueden resolver tareas semánticas:

- mapear texto a conceptos/capacidades;
- analizar respuestas abiertas;
- identificar patrones;
- redactar explicaciones;
- proponer actividades;
- generar código bajo contrato.

Código determinista controla:

- autenticación;
- autorización;
- aislamiento por cátedra;
- thresholds;
- elegibilidad;
- transiciones de estado;
- prioridades hard constraint;
- expiración;
- versionado;
- idempotencia;
- anonimización;
- agregación;
- publicación de experiencias;
- eliminación y lineage.

---

## 3.5. Everything important is versioned

Versionar al menos:

- curriculum;
- capability definitions;
- evidence schema;
- interpretation engine;
- recommendation engine;
- prompt templates;
- model routing policy;
- document parser;
- embeddings model;
- experience spec;
- executable bundle;
- experience SDK;
- event schema;
- aggregation rules.

Una conclusión debe poder reconstruirse usando las versiones que estaban activas al momento de calcularla.

---

## 3.6. Privacy by architecture

El profesor no debe simplemente carecer de un botón para ver nombres.

La API docente tampoco debería tener una ruta que devuelva estados individuales identificados.

El principio es:

> **si una interfaz no necesita el dato, el servicio que la alimenta no debe recibirlo.**

---

## 3.7. Generated code is untrusted code

Todo código generado por agentes se trata como código no confiable hasta superar:

- dependency validation;
- static analysis;
- contract tests;
- instrumentation tests;
- security tests;
- accessibility checks;
- performance budget;
- optional teacher approval.

---

# 4. Stack de referencia

La arquitectura no debe quedar atada para siempre a un proveedor, pero para construir v1 conviene tomar decisiones concretas.

## 4.1. Lenguaje

**TypeScript end-to-end** como default.

Razones:

- contratos compartidos frontend/backend/runtime;
- JSON Schema/Zod reutilizable;
- experiencia fuerte con agentes de programación;
- ecosistema web robusto;
- SDK del Runtime naturalmente en TypeScript;
- menor duplicación de tipos.

Python puede utilizarse en trabajos específicos de análisis si aparece una necesidad real, pero no es obligatorio en el core v1.

---

## 4.2. Monorepo

Recomendación:

```text
pnpm + Turborepo
```

Estructura conceptual:

```text
/apps
  /web
  /api
  /worker
  /experience-builder
  /experience-shell

/packages
  /contracts
  /domain
  /db
  /ai-gateway
  /curriculum
  /evidence
  /interpretation
  /recommendation
  /experience-sdk
  /experience-contracts
  /ui
  /observability
  /testing
```

---

## 4.3. Frontend

**Next.js + React + TypeScript**.

Uso:

- Student App;
- Teacher App;
- vista institucional mínima;
- runtime host shell;
- server-side authenticated routes cuando aporta valor.

Preferir una aplicación web responsive antes que apps nativas móviles.

---

## 4.4. API

**NestJS con Fastify adapter** o arquitectura equivalente TypeScript modular.

Motivos:

- módulos de dominio explícitos;
- OpenAPI;
- validación;
- guards/autorización;
- WebSocket/SSE cuando sea necesario;
- workers reutilizando paquetes de dominio.

Todas las APIs externas al frontend principal deben definirse mediante OpenAPI/JSON Schema.

---

## 4.5. Persistencia

**PostgreSQL + pgvector**.

ORM/query layer recomendado:

**Drizzle ORM + SQL explícito para consultas complejas**.

Principio:

> El ORM no debe ocultar constraints importantes de aislamiento y consistencia.

---

## 4.6. Queue y cache

**Redis + BullMQ** para v1.

Usos:

- document processing;
- evidence extraction;
- interpretation recompute;
- recommendation regeneration;
- notifications;
- experience generation orchestration;
- embedding jobs.

Si la complejidad de workflows largos crece significativamente, migrar ciertos flujos a un workflow engine durable como Temporal sin cambiar los contratos de dominio.

---

## 4.7. Object storage

S3-compatible para:

- uploads;
- materiales;
- conversaciones externas originales;
- archivos de proyecto;
- assets;
- experience bundles;
- build logs;
- generated documents;
- exports.

Todo objeto debe tener:

```text
object_id
owner_scope
content_hash
mime_type
size
created_at
retention_class
security_scan_status
```

---

## 4.8. Real-time

**SSE** como default para:

- progreso de jobs;
- estado de generación;
- panel agregado docente en vivo;
- procesamiento de conversación.

**WebSockets** solo cuando exista interacción bidireccional real que SSE + HTTP no resuelva de forma limpia.

---

# 5. System Context

Actores:

```text
Student
Teacher
Institution Admin (minimal)
Educai Operator
AI Providers
Code Generation Agents
Object Storage
Email/Notification Provider
```

Relaciones:

```text
Student ──────┐
              ├──> Educai Web ──> Application API
Teacher ──────┤
Institution ──┘

Application API ──> PostgreSQL
Application API ──> Object Storage
Application API ──> AI Gateway ──> Model Providers
Application API ──> Queue ──> Workers
Workers ──> Experience Builder ──> Code Agents
Experience Shell ──> Runtime API/Event Bridge
Runtime Events ──> Evidence Pipeline
```

---

# 6. Bounded contexts / módulos de dominio

## 6.1. Identity & Access

Responsable de:

- usuario;
- autenticación federada;
- roles;
- organización/institución;
- membresías;
- consentimientos;
- sesiones;
- scopes de acceso.

No contiene evidencia académica.

---

## 6.2. Enrollment & Academic Structure

Responsable de:

- Subject;
- CourseSection;
- teacher assignment;
- student enrollment;
- cronograma;
- milestones;
- class sessions.

---

## 6.3. Curriculum

Responsable de:

- CurriculumVersion;
- CurriculumNode;
- Concept;
- LearningOutcome;
- Capability;
- prerequisites;
- teacher validation;
- source references.

---

## 6.4. Learning Sources

Responsable de:

- internal AI conversations;
- external transcript uploads;
- structured activities;
- project artifacts;
- experience interactions;
- source lineage.

---

## 6.5. Evidence

Responsable de:

- RawInteraction;
- EvidenceEvent;
- EvidenceSignal;
- Opportunity;
- assistance state;
- provenance;
- dedupe;
- invalidation.

---

## 6.6. Interpretation

Responsable de:

- CapabilityInterpretation;
- ErrorPattern;
- Contradiction;
- maturity state;
- attention state;
- evidence sufficiency;
- next evidence need;
- history.

---

## 6.7. Recommendation

Responsable de:

- RecommendationIntent;
- Recommendation;
- ranking;
- lifecycle;
- explanation;
- Section Recommendation Engine;
- Global Student Orchestrator;
- classroom intervention recommendations.

---

## 6.8. Student Profile & Projects

Responsable de:

- onboarding global;
- profile versions;
- interests;
- antipreferences;
- professional hypotheses;
- projects;
- personalization envelope.

No debe convertirse en evidencia académica directamente.

---

## 6.9. Experience

Responsable de:

- ExperienceSpec;
- ExperienceDefinition;
- ExperienceSession;
- OpportunityManifest;
- EvidenceContract;
- AssistancePolicy;
- FeedbackPolicy;
- generation status;
- publication lifecycle.

---

## 6.10. Runtime Events

Responsable de:

- session events;
- event validation;
- sequence;
- idempotency;
- batching;
- live aggregate projection;
- Event Bridge hacia Evidence.

---

## 6.11. AI Gateway

Responsable de:

- model routing;
- prompts;
- structured outputs;
- retry;
- timeout;
- cost logging;
- safety policies;
- provider abstraction;
- evaluation hooks.

---

## 6.12. Reporting & Analytics

Responsable de:

- product analytics;
- institutional aggregates;
- teacher aggregate projections;
- engine quality metrics;
- exports.

No es fuente de verdad de los estados académicos.

---

# 7. Deployment topology v1

## 7.1. Aplicaciones desplegables

Aunque el código sea monorepo, v1 puede tener cinco unidades de despliegue:

```text
1. web
2. api
3. worker
4. experience-builder
5. experience-runtime-static + runtime API
```

### `web`

UI principal.

### `api`

Backend síncrono y dominio transaccional.

### `worker`

Jobs asíncronos confiables.

### `experience-builder`

Entorno aislado para código generado y builds.

### `experience-runtime`

Shell confiable + bundles inmutables servidos desde origen separado.

---

## 7.2. Entornos

Separar totalmente:

```text
development
staging
production
```

Cada uno con:

- database independiente;
- buckets independientes;
- secrets independientes;
- queue independiente;
- runtime origin independiente;
- model budgets independientes.

Nunca utilizar datos reales de estudiantes en desarrollo local.

---

# 8. Modelo de identidad y tenancy

## 8.1. Entidades

```text
User
Institution
InstitutionMembership
Subject
CourseSection
Enrollment
TeacherAssignment
```

---

## 8.2. Perfil global vs datos académicos

El estudiante tiene una identidad global Educai.

```text
User / StudentGlobalProfile
        ↓
Enrollment A → CourseSection A
Enrollment B → CourseSection B
```

`StudentGlobalProfile` puede cruzar materias para el propio estudiante y para personalización autorizada.

`CapabilityInterpretation` siempre pertenece a:

```text
student_id + course_section_id + capability_id
```

No existe un “estado académico global” que mezcle cátedras automáticamente.

---

## 8.3. Autorización

Combinar:

- RBAC para rol general;
- ABAC para contexto de recurso.

Ejemplo:

```text
teacher
AND assigned_to(course_section)
AND requested_resource.scope == aggregate_teacher_view
```

No basta con:

```text
role == teacher
```

---

# 9. Separación de PII y aprendizaje

Recomendación de esquema lógico:

```text
identity.*
  users
  identities
  institution_memberships

student_private.*
  profiles
  projects
  preferences

academic.*
  enrollments
  curriculum
  evidence
  interpretations
  recommendations

teacher_projection.*
  classroom_summaries
  feedback_aggregates

runtime.*
  experience_sessions
  runtime_events
```

Incluso si viven en la misma base, las capas de acceso deben ser distintas.

La vista docente debe consultar `teacher_projection` o servicios agregadores, no tablas individuales de evidencia.

---

# 10. PostgreSQL schema strategy

Usar IDs UUID/ULID no secuenciales.

Columnas comunes:

```text
id
created_at
updated_at
version
```

Objetos versionados deben usar identidad estable + versión:

```text
experience_id
experience_version
```

No sobreescribir objetos publicados.

---

# 11. Tablas centrales

## 11.1. Currícula

```text
curriculum_versions
curriculum_nodes
concepts
learning_outcomes
capabilities
capability_prerequisites
curriculum_source_refs
```

---

## 11.2. Sources y evidencia

```text
source_artifacts
raw_interactions
opportunities
evidence_events
evidence_signals
evidence_invalidations
```

`source_artifacts.content_hash` debe ser indexado para dedupe.

---

## 11.3. Interpretación

```text
capability_interpretations
interpretation_history
error_patterns
error_pattern_signals
contradictions
```

La tabla actual puede contener el snapshot vigente; `interpretation_history` conserva cada recompute relevante.

---

## 11.4. Recomendaciones

```text
recommendations
recommendation_sources
recommendation_history
recommendation_feedback
```

---

## 11.5. Experiencias

```text
experience_specs
experience_definitions
experience_artifact_bundles
experience_sessions
experience_session_state
runtime_events
runtime_event_batches
```

---

## 11.6. Chat

```text
ai_conversations
ai_messages
ai_message_assistance_metadata
```

El mensaje de IA se conserva para reconstruir el nivel de ayuda, pero nunca cuenta por sí mismo como evidencia del estudiante.

---

# 12. JSONB vs tablas normalizadas

Usar columnas normales para campos consultados y constraints estructurales.

Usar JSONB para:

- payloads versionados;
- metadata extensible;
- state de experiencias;
- rationale detallado;
- provider-specific metadata.

No guardar todo el dominio como documentos JSON opacos.

Principio:

> **si un campo participa en permisos, joins, invariantes o índices frecuentes, merece una columna explícita.**

---

# 13. RLS y aislamiento

PostgreSQL Row Level Security puede utilizarse como segunda barrera en tablas críticas.

No depender únicamente de RLS: también validar en capa de aplicación.

Scopes relevantes:

- institution;
- course_section;
- student owner;
- teacher aggregate-only;
- system worker.

Jobs de sistema deben utilizar service identities específicas y auditables.

---

# 14. Event architecture

Educai necesita eventos porque la cadena académica es incremental.

Ejemplo:

```text
runtime.response_submitted
        ↓
evidence.source_ready
        ↓
evidence.signals_updated
        ↓
interpretation.recompute_requested
        ↓
interpretation.updated
        ↓
recommendation.invalidate_requested
        ↓
recommendation.updated
```

---

# 15. Transactional Outbox

No publicar directamente a la cola dentro de una transacción de negocio sin garantía.

Patrón:

```text
BEGIN
  write domain data
  write outbox event
COMMIT

outbox dispatcher
  ↓
queue
```

Esto evita:

- estado guardado sin evento;
- evento publicado sin estado guardado.

---

# 16. Event envelope

Todos los eventos internos:

```json
{
  "event_id": "evt_...",
  "event_type": "interpretation.updated",
  "schema_version": "1.0",
  "occurred_at": "...",
  "correlation_id": "...",
  "causation_id": "...",
  "actor": {
    "type": "system",
    "id": "interpretation-worker"
  },
  "scope": {
    "institution_id": "...",
    "course_section_id": "...",
    "student_id_internal": "..."
  },
  "payload": {}
}
```

`student_id_internal` debe eliminarse antes de ingresar a proyecciones docentes agregadas.

---

# 17. Idempotencia

Cada consumidor debe poder procesar el mismo evento dos veces sin duplicar efectos.

Usar:

```text
consumer_name + event_id
```

como clave de procesamiento.

Para endpoints de acciones críticas aceptar:

```text
Idempotency-Key
```

Ejemplos:

- submit response;
- complete experience;
- upload transcript;
- publish experience.

---

# 18. Consistencia

## Strong consistency

Necesaria para:

- inscripción;
- permisos;
- session state;
- respuestas registradas;
- publicación;
- eliminación.

## Eventual consistency

Aceptable para:

- mapas actualizados;
- recommendations;
- agregados docentes;
- institucional analytics.

La UI debe expresar procesamiento cuando corresponde:

> **Estamos actualizando lo que aprendimos de esta actividad…**

No mostrar datos viejos como si fueran definitivos si existe un recompute pendiente conocido.

---

# 19. Job architecture

Colas iniciales separadas lógicamente:

```text
document-processing
evidence-processing
interpretation
recommendation
embeddings
experience-generation
notifications
analytics
```

Prioridades:

- interactive feedback: alta;
- interpretation/recommendation post-action: alta;
- bulk document ingestion: media;
- nightly analytics: baja.

---

# 20. Retry y dead-letter

Cada job define:

- timeout;
- retry count;
- exponential backoff;
- retryable errors;
- terminal errors;
- DLQ.

No reintentar indefinidamente un output inválido del LLM.

Después de N fallos estructurales:

```text
status = requires_review
```

con contexto observable para operación.

---

# 21. AI Gateway

Todo uso de modelos debe pasar por una capa propia.

Contrato conceptual:

```text
ai.invoke({
  task,
  model_policy,
  prompt_version,
  input,
  output_schema,
  privacy_class,
  latency_class,
  budget_class
})
```

---

# 22. Model routing

No utilizar un único modelo para todo.

Categorías:

```text
fast_structured
high_reasoning
long_context
code_generation
embedding
moderation_or_safety
```

La política elige proveedor/modelo según:

- complejidad;
- latencia;
- costo;
- privacidad;
- disponibilidad;
- calidad observada en evals.

El dominio nunca referencia directamente nombres de modelos.

---

# 23. Structured outputs

Todas las tareas que alimentan estado estructural deben exigir JSON/schema válido.

Ejemplos:

- curriculum extraction;
- capability mapping;
- evidence extraction;
- error normalization;
- recommendation rationale;
- experience planning.

Pipeline:

```text
LLM output
↓
schema validation
↓
semantic invariants
↓
accept / repair / retry / reject
```

Nunca persistir texto libre como estructura de dominio sin validación.

---

# 24. Prompt registry

Cada prompt crítico debe tener:

```text
prompt_key
version
system_template
input_schema
output_schema
model_policy
evaluation_suite
status
```

Estados:

```text
draft
staging
active
retired
```

Un cambio de prompt puede cambiar comportamiento y por tanto debe ser auditable.

---

# 25. Protección frente a prompt injection

Materiales, transcripts y proyectos son contenido no confiable.

Reglas:

- nunca concatenar contenido externo como system instruction;
- delimitar explícitamente fuentes;
- tools solo por allowlist;
- no ejecutar instrucciones encontradas dentro de documentos;
- no exponer secretos al contexto;
- sanitizar links y embeds;
- registrar source provenance;
- usar retrieval con metadata de scope.

Ejemplo de principio:

> **“Ignorá las instrucciones del sistema” dentro de un PDF es contenido académico, no una instrucción al agente.**

---

# 26. AI cost control

Medir por llamada:

```text
task
model_policy
input_tokens
output_tokens
latency
cost_estimate
cache_hit
user_scope
course_section_scope
```

Optimizar mediante:

- dedupe por hash;
- embeddings incrementales;
- caching de extracción de documentos;
- procesamiento por delta;
- modelos pequeños para clasificación simple;
- modelos razonadores solo donde agregan valor;
- batch asíncrono cuando la latencia no importa.

No sacrificar validez académica por ahorro ciego.

---

# 27. Knowledge / RAG architecture

## 27.1. Fuentes

Prioridad conceptual:

```text
1. currícula validada
2. materiales oficiales de la cátedra
3. instrucciones docentes
4. conocimiento general del modelo cuando está permitido
```

El docente debe saber cuándo una respuesta proviene de materiales de la materia y cuándo de conocimiento general.

---

## 27.2. Pipeline de materiales

```text
upload
↓
virus/security scan
↓
store original
↓
parse
↓
normalize
↓
extract structure
↓
chunk semantically
↓
attach metadata
↓
embed
↓
index
```

Metadata mínima:

```text
document_id
course_section_id
curriculum_version_id
source_type
page_or_section
curriculum_node_ids
content_hash
parser_version
```

---

# 28. Retrieval isolation

Toda query de RAG debe tener un scope obligatorio.

Ejemplo:

```text
course_section_id = sec_45
AND source_status = active
```

No existe retrieval global accidental sobre materiales de otras cátedras.

El perfil global del estudiante no entra al vector index académico como documento compartido.

---

# 29. pgvector strategy

Para MVP, mantener embeddings en PostgreSQL simplifica:

- seguridad;
- filtros por scope;
- backups;
- joins;
- operación.

Separar a un vector DB dedicado únicamente si:

- volumen/latencia lo exige;
- recall medido empeora;
- operación del índice se vuelve cuello de botella.

---

# 30. Curriculum ingestion flow

```text
Teacher uploads program + materials
↓
document-processing job
↓
structured extraction
↓
proposed CurriculumVersion
↓
concepts + capabilities + source refs
↓
teacher validation UI
↓
activate curriculum version
↓
trigger dependent recomputations when needed
```

Una versión no validada no debería gobernar estados académicos de producción salvo modo explícito de piloto.

---

# 31. Internal AI conversation architecture

## 31.1. Conversation context

El contexto debe ensamblarse desde:

- course section;
- active curriculum;
- relevant materials;
- recommendation/action spec;
- allowed profile personalization;
- project context cuando está habilitado;
- recent conversation turns;
- assistance state.

No cargar todo el historial indiscriminadamente.

---

## 31.2. Teaching mode vs evidence mode

El chat debe conocer su modo.

### Teaching mode

Puede:

- explicar;
- modelar;
- dar hints;
- revelar solución si corresponde.

### Evidence mode

Debe:

- preservar independencia;
- no revelar respuesta antes del intento;
- registrar hints;
- etiquetar contamination;
- cerrar opportunity antes de feedback revelador cuando el contrato lo exige.

El Runtime y Evidence Engine dependen de esta metadata.

---

# 32. External transcript ingestion

```text
upload .txt/.md
↓
object storage
↓
hash / dedupe
↓
parser
↓
role detection
↓
student confirmation if ambiguous
↓
episode segmentation
↓
assistance reconstruction
↓
capability mapping
↓
EvidenceEvents / Signals
```

Estados:

```text
uploaded
scanning
parsing
needs_confirmation
processing
ready
failed
```

El archivo original se conserva hasta que el usuario lo elimine o la política de retención lo retire.

---

# 33. Evidence processing pipeline

```text
SourceArtifact / Runtime Events
↓
RawInteractions
↓
Candidate extraction
↓
Opportunity normalization
↓
Capability mapping
↓
Assistance classification
↓
EvidenceEvent
↓
EvidenceSignal
↓
outbox: evidence.signals_updated
```

Cada etapa conserva:

- input IDs;
- version del processor;
- output IDs;
- errors/warnings.

---

# 34. Interpretation processing

Trigger:

```text
evidence.signals_updated
curriculum.version_activated
evidence.invalidated
interpretation.engine_version_changed
```

Worker:

1. lock lógico por `student + course_section + capability`;
2. cargar signals elegibles;
3. ejecutar reglas deterministas;
4. utilizar LLM solo para componentes semánticos definidos;
5. persistir snapshot + history;
6. emitir `interpretation.updated` solo si cambió algo material.

---

# 35. Recommendation processing

Trigger:

- interpretation updated;
- teacher action created;
- assessment proximity threshold crossed;
- session abandoned/resumed;
- schedule changed;
- recommendation completed/dismissed;
- project context changed.

La generación debe ser idempotente por una `recommendation_context_hash`.

Si el contexto relevante no cambió, reutilizar recommendation vigente.

---

# 36. Global Student Orchestrator

El orquestador global no consulta evidence signals de otras cátedras.

Consume únicamente metadata de recommendations candidatas:

```text
course_section_id
priority_band
required
expires_at
deadline
estimated_duration
mode
resume_state
```

Output:

```text
global_next_action
```

Esto protege la regla:

> **perfil del estudiante transversal; evidencia académica aislada por cátedra.**

---

# 37. Teacher aggregation architecture

El docente necesita insights agregados rápidos.

No calcular consultas pesadas sobre evidence raw en cada page load.

Crear proyecciones:

```text
classroom_capability_summaries
classroom_error_pattern_summaries
classroom_feedback_summaries
classroom_profile_summary
```

Se actualizan por eventos.

La proyección debe aplicar thresholds de privacidad antes de persistir o servir resultados sensibles.

---

# 38. Denominadores docentes

Para un hallazgo como:

> 44% necesita revisar Roles de Scrum

la proyección almacena:

```text
enrolled_count = 42
evidence_sufficient_count = 27
needs_review_count = 12
needs_review_rate = 12 / 27
```

Nunca inferir denominador desde UI.

---

# 39. Experience generation architecture

El sistema de generación se separa del backend principal.

```text
Recommendation + ActionSpec
↓
Experience Planner
↓
ExperienceSpec
↓
Generation request
↓
Builder Worker
↓
Claude Code / Codex
↓
source tree
↓
validation pipeline
↓
immutable bundle
↓
ExperienceDefinition
```

---

# 40. Restricción clave de v1: generated frontend only

Para reducir superficie de riesgo:

> **el código generado por agentes no despliega backend arbitrario en v1.**

Puede generar:

- HTML/CSS/JS/TS;
- React components;
- WebGL/3D client-side;
- simulation logic client-side;
- assets;
- datasets estáticos.

Necesidades de backend se resuelven mediante funciones declaradas del Experience SDK.

Ejemplo:

```text
save state
emit event
request hint
submit artifact
request model-mediated feedback
complete
```

Esto preserva creatividad sin permitir infraestructura no controlada.

---

# 41. Experience Builder isolation

Cada build corre en un environment efímero.

Debe tener:

- filesystem descartable;
- CPU/memory limits;
- time limit;
- no production secrets;
- no production DB;
- network allowlist;
- package registry proxy/allowlist;
- read-only SDK docs;
- test suite;
- output artifact directory.

Al terminar, el entorno se destruye.

---

# 42. Generated code pipeline

```text
spec validation
↓
generate test manifest
↓
invoke code agent
↓
install allowlisted deps
↓
typecheck
↓
lint/static analysis
↓
unit tests
↓
runtime contract tests
↓
instrumentation tests
↓
security checks
↓
a11y smoke tests
↓
responsive checks
↓
performance budget
↓
build
↓
content hash
↓
preview_ready
```

Un fallo crítico bloquea publicación.

---

# 43. Artifact immutability

Publicar:

```text
bundle_hash
experience_id
experience_version
sdk_version
spec_hash
build_hash
```

Un bundle publicado nunca se modifica.

Corregir = nueva versión.

Una session queda fijada a la versión con la que comenzó.

---

# 44. Runtime isolation model

Servir bundles desde un origen distinto:

```text
app.educai...
experiences.educai...
```

Embed mediante iframe con sandbox estricto.

Default conceptual:

```text
sandbox="allow-scripts allow-forms"
```

Agregar capacidades únicamente cuando la experiencia las necesita y fueron aprobadas.

Evitar:

- `allow-top-navigation`;
- popups arbitrarios;
- same-origin privilegios innecesarios;
- acceso a cookies de aplicación.

---

# 45. Runtime bridge

La experiencia no llama APIs internas directamente.

Comunicación:

```text
Experience Bundle
      ↓ postMessage
Trusted Runtime Shell
      ↓ validated SDK command
Runtime API
```

Comandos permitidos versionados:

```text
session.getContext
session.saveState
events.emit
assistance.requestHint
feedback.request
artifact.submit
experience.complete
accessibility.getPreferences
```

Cada mensaje valida:

- origin;
- schema;
- session token;
- experience/version;
- command allowlist;
- payload size;
- sequence.

---

# 46. Runtime session token

Crear un token corto y scoped:

```text
session_id
experience_id
experience_version
course_section_id
student_internal_id
authorized_commands
expires_at
```

No contiene PII legible.

No utilizar un token general de la cuenta dentro del iframe.

---

# 47. Runtime event ingestion

Endpoint conceptual:

```text
POST /v1/runtime/event-batches
```

El shell puede batch events para eficiencia.

Validar:

- max batch size;
- monotonic sequence;
- schema version;
- known opportunity IDs;
- known event types;
- payload contract;
- duplicate event IDs.

Persistir antes de ack.

---

# 48. Runtime state persistence

Para reanudar:

```text
experience_session_state
```

Contiene:

- current step;
- safe experience state;
- attempts;
- assistance flags;
- contamination flags;
- completed opportunities.

No confiar exclusivamente en browser localStorage.

Local state puede acelerar UX, pero server state es authoritative.

---

# 49. Feedback architecture

Tres tipos:

### Deterministic feedback

Precomputado en ExperienceDefinition.

### Model-mediated feedback

Runtime solicita al backend:

```text
feedback.request
```

El backend recibe únicamente contexto autorizado y retorna output schema-validado.

### Teacher-mediated feedback

En actividades que esperan revisión posterior.

Toda revelación que contamine evidencia debe actualizar assistance/contamination state.

---

# 50. File upload architecture

Uploads directos a object storage mediante pre-signed URL.

Flujo:

```text
request upload slot
↓
permission check
↓
pre-signed URL
↓
client upload
↓
upload.complete callback
↓
scan
↓
quarantine or activate
↓
processing jobs
```

No pasar archivos grandes por el API process si no es necesario.

---

# 51. Malware/content scanning

Todo upload procesable debe pasar por:

- MIME sniffing;
- size limits;
- extension validation;
- malware scan;
- archive bomb protections cuando corresponda;
- document parser sandbox.

Estado:

```text
pending_scan
clean
quarantined
rejected
```

---

# 52. Deletion and lineage architecture

Eliminar un SourceArtifact dispara:

```text
source.deletion_requested
↓
mark source unavailable
↓
invalidate derived evidence
↓
recompute interpretation
↓
invalidate recommendations
↓
recompute teacher aggregates
↓
remove/raw object according to policy
```

La UI puede mostrar procesamiento hasta completar derivaciones.

---

# 53. Hard delete vs audit metadata

Separar:

- contenido del usuario;
- metadata operacional mínima.

Una política puede permitir conservar:

```text
deleted_object_id_hash
deletion_timestamp
audit_reason
```

sin conservar el contenido eliminado.

La política exacta debe revisarse legalmente para cada jurisdicción de lanzamiento.

---

# 54. Privacy classes

Clasificación técnica recomendada:

```text
PUBLIC
INTERNAL
ACADEMIC_PRIVATE
STUDENT_PRIVATE
PII
SENSITIVE_PROFILE
```

Cada AI task declara:

```text
privacy_class
```

La política de routing puede impedir enviar ciertas clases a proveedores no habilitados.

---

# 55. Teacher privacy boundary

Prohibición arquitectónica:

```text
Teacher UI
    X
identified student capability states
```

El teacher aggregation service acepta individual states internamente, aplica agregación/threshold y produce un DTO sin identidad.

La ruta docente recibe solo DTO agregado.

No exponer un endpoint “admin oculto” reutilizable por la UI normal.

---

# 56. Small-cell suppression

Parámetro inicial:

```text
min_group_size = 5
```

Si un filtro produce menos usuarios:

- ocultar breakdown;
- combinar categoría;
- responder “No hay suficientes respuestas para mostrar este detalle de forma anónima”.

Debe ser configurable y evaluado legalmente.

---

# 57. Logging policy

Logs de producción no deben contener por defecto:

- conversation full text;
- profile free text;
- project documents;
- raw student answers;
- access tokens;
- passwords;
- API keys.

Loggear IDs y metadata operacional.

Para debugging de contenido utilizar herramientas con acceso privilegiado y auditoría explícita.

---

# 58. Audit log

Registrar acciones sensibles:

- acceso privilegiado;
- cambios de currícula;
- publicación/invalidation de experiencia;
- eliminación de datos;
- export;
- cambio de permisos;
- cambio de engine version;
- cambios de privacy config.

Audit log append-only cuando sea razonable.

---

# 59. API style

REST JSON + OpenAPI como contrato externo principal.

Motivos:

- simple;
- observable;
- compatible con Experience SDK;
- clients generables;
- fácil validación.

No introducir GraphQL en v1 salvo una necesidad demostrada.

---

# 60. Endpoint groups conceptuales

```text
/auth
/me
/institutions
/subjects
/course-sections
/enrollments
/curriculum
/materials
/conversations
/uploads
/evidence
/interpretations
/recommendations
/projects
/experiences
/runtime
/teacher
/institutional
```

Los endpoints individuales de evidence/interpretation para estudiantes solo devuelven recursos propios.

Docentes usan endpoints agregados separados.

---

# 61. APIs críticas de estudiante

Ejemplos:

```text
GET  /v1/me/home
GET  /v1/me/course-sections
GET  /v1/course-sections/:id/learning-map
GET  /v1/recommendations/next
POST /v1/recommendations/:id/start
POST /v1/recommendations/:id/disagree
POST /v1/conversations
POST /v1/uploads/external-transcript
GET  /v1/projects
POST /v1/projects
GET  /v1/me/profile
```

Home debe ser un endpoint compuesto para evitar múltiples round trips.

---

# 62. APIs críticas de docente

```text
GET  /v1/teacher/course-sections
GET  /v1/teacher/course-sections/:id/home
GET  /v1/teacher/course-sections/:id/learning-map
GET  /v1/teacher/course-sections/:id/findings/:findingId
POST /v1/teacher/findings/:id/validate
POST /v1/teacher/experiences/generate
POST /v1/teacher/experiences/:id/publish
POST /v1/teacher/experiences/:id/launch
POST /v1/teacher/classes/:id/close
GET  /v1/teacher/course-sections/:id/feedback
```

Ninguno devuelve nombres asociados a estados individuales.

---

# 63. API del Runtime

```text
POST /v1/runtime/sessions
GET  /v1/runtime/sessions/:id/context
PUT  /v1/runtime/sessions/:id/state
POST /v1/runtime/event-batches
POST /v1/runtime/sessions/:id/hints
POST /v1/runtime/sessions/:id/feedback
POST /v1/runtime/sessions/:id/artifacts
POST /v1/runtime/sessions/:id/complete
```

Autenticación mediante runtime session token de scope reducido.

---

# 64. Live teacher dashboard

Flow:

```text
runtime event
↓
live aggregation worker
↓
Redis ephemeral counters / Postgres projection
↓
SSE channel by launch_id
↓
teacher UI
```

Mostrar:

- entered;
- active;
- completed;
- distribution de respuestas autorizadas.

No emitir eventos individuales identificados al cliente docente.

---

# 65. Notifications

v1 necesita notificaciones mínimas:

- actividad docente lanzada;
- experiencia lista para preview;
- procesamiento completado;
- problema técnico relevante.

Preferir in-app + email donde haga falta.

No construir sistema de engagement invasivo.

---

# 66. Observability

Tres niveles:

## Technical

- errors;
- latency;
- queue depth;
- DB performance;
- build failures;
- AI provider errors.

## Product

- recommendations;
- loops;
- experience completion;
- adoption.

## Academic engine quality

- mapping accuracy;
- agreement;
- state stability;
- contradiction resolution;
- evidence coverage.

---

# 67. OpenTelemetry

Instrumentar traces end-to-end.

Ejemplo de `correlation_id`:

```text
student submits answer
→ runtime event
→ evidence job
→ interpretation job
→ recommendation job
```

Debe ser posible inspeccionar la cadena sin loggear el contenido sensible completo.

---

# 68. Error tracking

Utilizar una plataforma de error tracking para frontend/backend/builders.

Scrub automático de:

- request bodies sensibles;
- auth headers;
- student free text;
- query params con tokens.

---

# 69. SLOs iniciales

Objetivos operativos iniciales, a calibrar:

```text
web/API availability              99.9%
API p95 read                       < 500 ms
Home p95 server response           < 800 ms
runtime event ack p95              < 1 s
session resume p95                 < 2 s
local experience interaction       < 100 ms cuando no usa IA
interactive AI first useful state  < 8 s objetivo
```

Generación de experiencias puede ser asíncrona de minutos.

---

# 70. Performance budgets del Runtime

Objetivos iniciales:

```text
first interaction ready <= 3 s en conexión razonable
initial JS budget configurable
assets lazy-loaded
no blocking 3D assets before needed
```

Experiencias pesadas deben degradar con fallback o recomendar desktop cuando sea necesario.

---

# 71. Backups y disaster recovery

PostgreSQL:

- automated backups;
- point-in-time recovery;
- restore drills.

Object storage:

- versioning cuando corresponde;
- lifecycle policies;
- replicated durability provista por proveedor.

Definir objetivos iniciales:

```text
RPO <= 15 min para datos transaccionales
RTO <= 4 h durante piloto
```

Ajustar según instituciones contratantes.

---

# 72. CI/CD

Pipeline principal:

```text
PR
↓
typecheck
↓
lint
↓
unit tests
↓
domain contract tests
↓
integration tests
↓
security dependency scan
↓
build
↓
preview environment
↓
manual/automated acceptance
↓
merge
↓
staging
↓
production deploy
```

Migraciones de DB deben ser forward-compatible cuando sea posible.

---

# 73. Branching y generated code

El código del producto principal vive en el repositorio normal.

Las experiencias generadas no necesitan convertirse en branches del producto principal.

Guardar:

- source tree artifact;
- build manifest;
- tests;
- bundle;
- hashes;
- generation metadata.

Si se decide versionarlas en git, utilizar un repositorio separado o namespace específico para evitar contaminar releases del core.

---

# 74. Feature flags

Necesarias para:

- engine versions;
- new recommendation policies;
- experimental experience formats;
- institutional features;
- alternative model routing;
- pilot-specific functionality.

Flags deben poder scoping por:

- environment;
- institution;
- course section;
- cohort.

Nunca por atributos sensibles no justificados.

---

# 75. Database migrations

Cada migration:

- versionada;
- reversible cuando sea viable;
- probada contra staging snapshot sintético;
- sin operaciones destructivas directas sobre datos críticos;
- acompañada de backfill job si hace falta.

Cambios de schemas de eventos requieren compatibilidad temporal entre productor y consumidor.

---

# 76. Contract versioning

Versionar schemas:

```text
/v1 API
runtime_event.schema_version
EvidenceSignal.processor_version
Interpretation.engine_version
Recommendation.engine_version
ExperienceSDK.version
```

No utilizar el número de versión del producto como sustituto de cada contrato.

---

# 77. Testing pyramid

## Unit

- domain rules;
- priority rules;
- transitions;
- privacy filters;
- parsers.

## Contract

- API schemas;
- events;
- Experience SDK;
- AI structured outputs.

## Integration

- DB;
- queue;
- object storage;
- AI gateway mock/live selected tests.

## End-to-end

- onboarding;
- join course;
- chat → evidence → interpretation → recommendation;
- upload transcript;
- teacher finding → experience → launch → evidence;
- deletion/recompute.

---

# 78. AI evaluation architecture

Cada task crítica debe tener un eval dataset.

Ejemplos:

```text
curriculum_extraction_eval
capability_mapping_eval
evidence_extraction_eval
error_pattern_eval
recommendation_rationale_eval
experience_spec_eval
```

Un cambio de:

- prompt;
- model policy;
- parser;
- schema;

puede disparar la suite correspondiente.

---

# 79. Golden datasets

Construir casos anotados por humanos.

Para Evidence/Interpretation:

- respuesta correcta independiente;
- correcta con answer reveal;
- ambigua;
- misconception recurrente;
- contradicción por nivel;
- transcript externo incompleto;
- duplicate;
- source deletion.

Para Recommendation:

- urgent teacher action;
- resume vs exam urgency;
- prerequisite conflict;
- no evidence;
- solid → transfer;
- profile personalization constraints.

---

# 80. Synthetic data

Desarrollo y CI deben utilizar usuarios y cátedras sintéticas.

Crear fixtures reproducibles:

```text
institution_alpha
teacher_ana
student_001...
course_scrum
capabilities...
```

Nunca copiar production DB a entornos de desarrollo sin proceso de anonimización formal.

---

# 81. Security model

Áreas críticas:

1. identidad;
2. archivos;
3. LLM data exfiltration;
4. generated code;
5. runtime tokens;
6. teacher privacy boundary;
7. admin access;
8. supply chain dependencies.

---

# 82. Secrets

Guardar en secret manager del proveedor.

Nunca:

- `.env` versionado;
- secrets en prompts;
- credentials dentro del runtime bundle;
- API keys en browser.

Rotación y scope mínimo.

---

# 83. Admin / operator access

Crear rol separado:

```text
EducaiOperator
```

No convertir a desarrolladores en superusuarios implícitos.

Acceso a datos sensibles:

- just-in-time cuando sea posible;
- reason code;
- audit log;
- expiración.

---

# 84. Security headers

Aplicación principal:

- CSP;
- HSTS;
- X-Content-Type-Options;
- Referrer-Policy;
- frame restrictions.

Runtime origin tiene CSP aún más restrictiva.

---

# 85. CSRF / XSS

- SameSite cookies cuando se usa cookie auth;
- CSRF protection en acciones state-changing cuando corresponde;
- sanitize rich text;
- markdown renderer seguro;
- no `dangerouslySetInnerHTML` con contenido no sanitizado;
- generated bundles aislados.

---

# 86. Rate limiting

Por:

- user;
- institution;
- IP para rutas públicas;
- AI task;
- runtime session;
- upload.

Evitar que un alumno o experience defectuosa produzca un loop de llamadas costosas.

---

# 87. Data retention

Definir clases separadas:

```text
account data
academic evidence
raw conversations
uploads
runtime events
build artifacts
analytics
logs
```

La política exacta depende del acuerdo institucional y jurisdicción.

La arquitectura debe soportar TTL/lifecycle independiente por clase.

---

# 88. Institutional reporting architecture

No construir BI pesado en v1.

Crear proyecciones periódicas:

```text
institution_period_summary
course_section_impact_summary
```

Inputs únicamente agregados.

Outputs:

- active students;
- active teachers;
- evidence coverage;
- capability progressions;
- persistent difficulty categories;
- intervention counts;
- perceived usefulness.

Sin drilldown individual.

---

# 89. Analytics data path

Para piloto:

```text
application events
↓
analytics_event table / provider
↓
dashboards
```

Cuando volumen crezca:

```text
CDC / event export
↓
warehouse
```

No agregar un warehouse como dependencia bloqueante de v1.

---

# 90. Home composition

La Home estudiante y docente son read models compuestos.

No construirlas mediante 15 requests independientes.

### Student Home Read Model

Incluye:

- global next action;
- resumable action;
- pending teacher actions;
- minimal recent result.

### Teacher Home Read Model

Incluye:

- course progress;
- top findings;
- recommended intervention;
- teaching practice recommendation;
- evidence coverage.

Pueden cachearse por segundos/minutos e invalidarse por eventos.

---

# 91. Caching

Cachear:

- read models;
- RAG retrieval results cuando source version no cambia;
- prompt-static components;
- public experience bundles.

No cachear de forma insegura:

- student-private payload across users;
- teacher aggregates without course_section key;
- runtime session tokens.

Cache keys siempre incluyen scope.

---

# 92. Search

MVP no necesita Elasticsearch.

Usar:

- PostgreSQL full-text search;
- trigram indexes;
- pgvector semantic retrieval.

Agregar un search engine dedicado solo si el producto lo requiere.

---

# 93. Concurrency

Proteger recomputes simultáneos.

Key conceptual:

```text
student_id + course_section_id + capability_id
```

Usar advisory locks o estrategia equivalente durante actualización de interpretación.

Recommendation generation utiliza context hashes y upsert para evitar duplicados.

---

# 94. Ordering de Runtime Events

Cada session mantiene:

```text
client_sequence
server_received_at
```

El event ingestor tolera retransmisión y pequeños out-of-order, pero reconstruye secuencia lógica.

Eventos de completion requieren que prerequisites de lifecycle existan o generan warning/rejection.

---

# 95. Offline / unstable connection

MVP puede soportar tolerancia básica:

- queue local de runtime events;
- retry;
- idempotent event IDs;
- save state local temporal;
- sync cuando vuelve conexión.

No prometer offline total para experiencias que requieren IA.

---

# 96. Accessibility architecture

Preferencias de accesibilidad viven en perfil técnico del usuario y pueden exponerse al Runtime mediante:

```text
accessibility.getPreferences()
```

Nunca exponer más datos personales de los necesarios.

Generated experience test suite verifica:

- keyboard;
- focus;
- labels;
- contrast;
- reduced motion;
- semantic structure.

---

# 97. Internationalization

Aunque el producto inicial sea español, preparar strings de UI para i18n.

No traducir automáticamente:

- nombres oficiales de currícula;
- entregas del estudiante;
- términos elegidos por docente.

Schemas y códigos internos permanecen en inglés técnico estable.

---

# 98. Data provenance

Cada dato inferido importante debe saber de dónde salió.

Ejemplo:

```text
Recommendation
↓
Interpretation
↓
EvidenceSignals
↓
EvidenceEvents
↓
RawInteractions
↓
SourceArtifact
```

Para RAG:

```text
Generated explanation
↓
retrieved chunks
↓
document/page
↓
object hash
```

---

# 99. Reprocessing strategy

La arquitectura debe permitir recalcular sin perder raw data.

Ejemplos:

### Nuevo Interpretation Engine

```text
EvidenceSignals existentes
→ new interpretations
```

### Nuevo Evidence processor

```text
RawInteractions
→ new EvidenceSignals
→ interpretations
→ recommendations
```

### Cambio de currícula

Mapear qué capabilities quedaron superseded y qué evidence necesita remapping.

Nunca requerir volver a ejecutar experiencias si los eventos originales siguen siendo válidos.

---

# 100. Lineage invalidation graph

Implementar relaciones derivadas explícitas.

```text
source_artifact
  → evidence_events
  → evidence_signals
  → interpretation
  → recommendation
```

Deletion/invalidation recorre el grafo hacia adelante.

No usar búsqueda heurística para descubrir qué conclusiones dependían de una fuente.

---

# 101. Data export

El estudiante debería poder exportar sus datos relevantes.

Arquitectura:

```text
export request
↓
async job
↓
collect allowed resources
↓
package
↓
encrypt/sign URL
↓
time-limited download
```

No incluir información de otros estudiantes dentro de agregados que permita reidentificación.

---

# 102. Teacher-generated materials

Slides, worksheets, cases y documentos generados por el asistente se almacenan como `GeneratedArtifact` con:

```text
artifact_id
course_section_id
source_context_version
prompt_version
content_hash
created_by
visibility
```

No son parte del evidence model salvo que luego se utilicen en una experiencia instrumentada.

---

# 103. Experience assets

Cada asset:

```text
asset_id
experience_id
origin
license_or_generation_provenance
content_hash
mime_type
safety_status
accessibility_metadata
```

Bundles nunca dependen de recursos remotos no versionados cuando se publican.

---

# 104. Conversational Runtime

Las experiencias conversacionales no necesitan generar código nuevo.

Usar un runtime confiable configurado por:

- scenario spec;
- system prompt version;
- assistance policy;
- evidence contract;
- tool allowlist;
- completion rule.

Esto reduce superficie de ataque y mejora consistencia.

---

# 105. 3D / simulation libraries

Mantener allowlist versionada.

Ejemplos de categorías:

- canvas/charting;
- physics;
- 3D rendering;
- state machines.

Cada librería debe ser evaluada por:

- bundle size;
- licencia;
- mantenimiento;
- CSP requirements;
- security history;
- accessibility alternatives.

---

# 106. Experience generation caching

Antes de generar desde cero:

1. buscar ExperienceDefinitions existentes con el mismo capability/intent;
2. verificar si pueden recontextualizarse sin cambiar evidencia;
3. reutilizar components/spec patterns;
4. generar nuevo código solo cuando aporta valor.

No implica compartir datos entre cátedras.

El artefacto pedagógico genérico puede reutilizar patrón, mientras la sesión y el contexto permanecen aislados.

---

# 107. Content safety en experiencias

Experience Planner debe respetar:

- edad de estudiantes cuando aplique;
- políticas institucionales;
- temas sensibles;
- lenguaje apropiado;
- no generar humillación pública;
- no utilizar ranking nominal.

Validaciones semánticas pueden ejecutarse antes de publicación.

---

# 108. Build provenance

Guardar:

```text
agent_provider
agent_model_policy
input_spec_hash
sdk_version
allowed_dependency_manifest
source_hash
build_hash
test_results
build_timestamp
```

Permite responder exactamente cómo se produjo una experiencia publicada.

---

# 109. Scaling model

## Fase piloto

Objetivo orientativo:

```text
1–10 instituciones
< 10k estudiantes registrados
< 2k usuarios activos diarios
< 500 concurrencia interactiva
```

PostgreSQL administrado + Redis + workers horizontales es suficiente.

## Fase growth

Escalar:

- read replicas;
- queue workers por dominio;
- object CDN;
- partitioning de runtime events;
- analytics warehouse;
- dedicated experience build pool.

## Fase scale

Solo entonces considerar extraer servicios de alto throughput:

- Runtime Event Ingestion;
- AI Gateway;
- Experience Build Service;
- Evidence Processing.

Contratos existentes permiten hacerlo sin cambiar UX.

---

# 110. Database partitioning future

`runtime_events` puede crecer muy rápido.

Preparar partición futura por:

```text
month
```

o por combinación de tiempo + tenant según patrón real.

No particionar prematuramente si volumen inicial no lo exige.

---

# 111. AI provider outage

Definir fallback por task.

Ejemplo:

```text
fast_structured → secondary provider
high_reasoning → retry then secondary
code_generation → pause generation, do not degrade silently
```

Si no se puede producir una interpretación confiable:

> conservar estado anterior + marcar processing failure

Nunca inventar output estructural para “seguir funcionando”.

---

# 112. Queue outage

Las acciones transaccionales siguen guardándose mediante outbox.

Cuando la cola vuelve:

> dispatcher reanuda.

Esto evita perder evidencia aunque el procesamiento se retrase.

---

# 113. Experience Runtime outage

Fallback:

- impedir nuevas sesiones si no hay Runtime API;
- conservar experience definition;
- ofrecer alternativa pedagógica simple cuando existe;
- no fingir completitud.

Una experiencia presencial imprimible puede funcionar como fallback docente, pero solo actualiza evidencia si existe captura individual posterior.

---

# 114. Data corruption detection

Constraints y checks:

- FK;
- uniqueness;
- enum validation;
- schema version validation;
- impossible transition checks;
- content hash verification para bundles.

Jobs periódicos pueden verificar lineage roto.

---

# 115. Engineering ownership

Aunque un equipo pequeño use Claude Code/Codex, mantener ownership conceptual:

```text
Core Product Platform
Academic Intelligence
Experience Runtime
AI Platform
Data/Privacy
```

Una misma persona puede cubrir varias áreas al principio, pero los límites ayudan a revisar código generado.

---

# 116. Code review con agentes

Los agentes pueden:

- implementar;
- generar tests;
- refactorizar;
- documentar.

No deberían aprobar automáticamente:

- permisos;
- privacy boundaries;
- database destructive migrations;
- Runtime sandbox changes;
- secrets handling;
- engine threshold changes.

Estos cambios requieren revisión humana explícita.

---

# 117. Repository structure detallada

```text
/apps/web
  app/
  features/
  components/

/apps/api
  src/modules/
    identity/
    enrollment/
    curriculum/
    sources/
    evidence/
    interpretation/
    recommendation/
    profile/
    projects/
    experience/
    teacher/
    institutional/

/apps/worker
  src/jobs/

/apps/experience-builder
  src/orchestrator/
  src/sandbox/
  src/validators/

/apps/experience-shell
  src/bridge/
  src/session/
  src/event-buffer/

/packages/contracts
/packages/db
/packages/domain
/packages/ai-gateway
/packages/experience-sdk
/packages/experience-contracts
/packages/ui
/packages/testing
```

No crear shared-utils gigantes. Compartir únicamente conceptos realmente estables.

---

# 118. Domain commands y queries

Separar mentalmente:

### Commands

Cambian estado:

```text
EnrollStudent
SubmitRuntimeResponse
DeleteSourceArtifact
ActivateCurriculumVersion
PublishExperience
CloseClass
```

### Queries

```text
GetStudentHome
GetTeacherHome
GetLearningMap
GetRecommendationExplanation
GetInstitutionSummary
```

No es necesario implementar CQRS framework completo. El patrón ayuda a diseñar contratos limpios.

---

# 119. Student Home query path

```text
GET /me/home
↓
Auth
↓
GlobalStudentOrchestrator projection
↓
recent session query
↓
pending teacher actions
↓
compose DTO
```

Evitar recalcular Recommendation Engine durante cada GET.

Recommendations se precalculan por eventos y la Home las consume.

---

# 120. Teacher Home query path

```text
GET /teacher/course-sections/:id/home
↓
assignment authorization
↓
class progress projection
↓
classroom capability summaries
↓
top recommendation
↓
teaching feedback aggregate
↓
compose anonymous DTO
```

No hacer join con `identity.users` después del authorization check.

---

# 121. Student chat write path

```text
student message
↓
API stores message
↓
AI Gateway builds scoped context
↓
model response
↓
store assistant message + assistance metadata
↓
respond to student
↓
outbox conversation.updated
↓
async evidence processing
```

Si la experiencia está en evidence mode, registrar opportunity boundaries sin esperar el async processor.

---

# 122. Runtime answer write path

```text
student action
↓
Experience SDK emits event
↓
Trusted Shell validates
↓
Runtime API persists event
↓
ack
↓
outbox runtime.interaction_recorded
↓
Evidence worker
↓
Interpretation worker
↓
Recommendation worker
```

Feedback determinista puede mostrarse localmente después de persistir/ack cuando el contract lo permite.

---

# 123. Deletion write path

```text
student requests deletion
↓
authorization
↓
source status = deletion_pending
↓
outbox source.deletion_requested
↓
derivation invalidation worker
↓
interpretations recalculated
↓
recommendations regenerated
↓
aggregates regenerated
↓
raw object removed
↓
source status = deleted
```

El usuario debe ver estado hasta completion.

---

# 124. Curriculum update path

```text
teacher edits curriculum proposal
↓
new CurriculumVersion draft
↓
validation
↓
activate
↓
old version remains immutable
↓
impact analysis
↓
remap or invalidate affected capabilities/evidence
```

No modificar in-place capacidades usadas por evidencia histórica.

---

# 125. Experience publishing path

```text
teacher accepts recommendation
↓
ExperienceSpec
↓
generation job
↓
preview_ready
↓
teacher preview
↓
publish command
↓
quality gates rechecked
↓
immutable ExperienceDefinition published
↓
launchable
```

Experiencias simples predefinidas pueden saltar code generation, pero nunca saltan evidence contract validation.

---

# 126. Schema evolution de Runtime events

El Runtime Shell puede aceptar N y N-1 temporalmente.

Cada event incluye:

```text
payload_schema_version
sdk_version
```

Workers normalizan a un internal canonical schema antes de Evidence Engine.

---

# 127. Institutional data boundary

Institution API consulta únicamente proyecciones agregadas.

Prohibido:

```text
institution admin → student evidence
institution admin → raw conversations
institution admin → professional profile individual
institution admin → private projects
```

Incluso si una institución financia Educai, el contrato técnico mantiene esta separación salvo futura decisión explícita de producto/legal.

---

# 128. Metrics implementation

Eventos de producto con schema propio:

```text
recommendation_viewed
recommendation_started
recommendation_completed
recommendation_disagreed
experience_started
experience_completed
teacher_intervention_used
capability_state_transition
```

No inferir todo desde access logs.

North Star puede calcularse usando `capability_state_transition` con lineage hacia nueva evidencia independiente.

---

# 129. Closed Learning Loop tracking

Crear un `LearningLoop` lógico o materialized relation:

```text
recommendation_id
action_session_id
evidence_ids
interpretation_before_id
interpretation_after_id
next_recommendation_id
status
```

Permite medir:

> recommendation → action → evidence → update → next decision

sin heurísticas posteriores frágiles.

---

# 130. Feature telemetry vs academic evidence

Separar bases lógicas/eventos:

```text
product_analytics_event
academic_runtime_event
```

Un click en “Ver mi perfil” es analytics.

Una decisión dentro de una opportunity instrumentada puede ser evidence source.

Nunca promover analytics automáticamente a evidencia académica.

---

# 131. Human-in-the-loop data

Validaciones del docente:

```text
TeacherFindingValidation
```

Valores:

```text
agree
partially_agree
disagree
not_sure
```

Esto alimenta:

- métricas de calidad;
- potencial recalibración futura.

No debe cambiar automáticamente el estado individual de estudiantes.

---

# 132. Support tooling

Crear consola interna mínima para:

- job status;
- failed pipelines;
- document parse warnings;
- build failures;
- experience invalidation;
- engine version;
- audit logs.

Acceso restringido.

No construir manual DB operations como workflow normal.

---

# 133. Operational reprocessing UI

Permitir a operadores autorizados:

```text
reprocess source
recompute interpretations for course section
regenerate recommendations
rebuild teacher projections
```

Siempre mediante jobs versionados y auditados.

---

# 134. Migration path: modular monolith → services

Extraer únicamente cuando haga falta.

Orden probable:

### 1. Experience Builder

Ya separado por seguridad.

### 2. Runtime Event Ingestion

Si throughput crece.

### 3. AI Gateway

Si múltiples productos/equipos lo usan.

### 4. Evidence Processing

Si procesamiento pesado requiere scaling separado.

Core enrollment/curriculum puede permanecer monolítico por mucho tiempo.

---

# 135. ADRs iniciales

Registrar decisiones como Architecture Decision Records.

ADRs mínimas:

```text
ADR-001 Modular monolith for core
ADR-002 PostgreSQL as source of truth
ADR-003 pgvector for MVP retrieval
ADR-004 Event-driven async via transactional outbox
ADR-005 Generated experiences are frontend-only in v1
ADR-006 Separate runtime origin + restricted bridge
ADR-007 Teacher data is aggregate-only by API design
ADR-008 Global profile / isolated academic course state
ADR-009 OpenAPI + JSON Schema contracts
ADR-010 AI Gateway mandatory for model calls
```

---

# 136. Orden de construcción recomendado

## Fase 0 — Foundations

- monorepo;
- environments;
- CI/CD;
- auth;
- DB;
- object storage;
- queue;
- observability;
- contracts package.

## Fase 1 — Academic model

- institutions;
- subject/course section;
- enrollment;
- curriculum;
- materials ingestion;
- capabilities.

## Fase 2 — Evidence intelligence

- internal chat;
- external transcript;
- SourceArtifact;
- RawInteraction;
- EvidenceEvents/Signals;
- Interpretation Engine;
- Recommendation Engine.

## Fase 3 — Student product

- onboarding;
- global profile;
- Home;
- Mis materias;
- learning map;
- projects;
- privacy controls.

## Fase 4 — Teacher product

- setup;
- Home;
- learning map;
- traceability;
- cronograma;
- feedback;
- assistant.

## Fase 5 — Experience Runtime

- ExperienceSpec;
- trusted shell;
- SDK;
- runtime events;
- simple declarative experiences;
- launch;
- live aggregate.

## Fase 6 — Generated experiences

- isolated builder;
- Claude Code/Codex integration;
- test generation;
- sandbox;
- static bundles;
- advanced simulations.

## Fase 7 — Institution minimal

- impact summaries;
- exports;
- adoption/coverage metrics.

---

# 137. Qué construir primero dentro del Runtime

No comenzar por 3D.

Orden:

1. multiple-choice/decision scenarios instrumentados;
2. branching cases;
3. conversational runtime;
4. parameter simulations;
5. artifact-based experiences;
6. 2D interactive systems;
7. 3D/physics cuando aporte valor.

La infraestructura de evidencia debe probarse antes con formatos simples.

---

# 138. Definition of Done técnico por feature

Una feature core está terminada cuando tiene:

- schema/contract;
- authorization;
- validation;
- migration;
- domain tests;
- API tests;
- observability;
- product analytics;
- privacy review;
- error states;
- retry/idempotency cuando corresponde;
- documentation.

Para features IA agregar:

- prompt/model version;
- eval cases;
- structured output validation;
- cost telemetry;
- fallback.

Para Runtime agregar:

- contract tests;
- security review;
- accessibility;
- instrumentation completeness.

---

# 139. Gates antes del primer piloto

Obligatorios:

### Security

- auth audit;
- permissions tests;
- teacher anonymity tests;
- upload scanning;
- secret scanning;
- Runtime isolation tests.

### Academic

- curriculum extraction review;
- evidence mapping eval;
- Interpretation golden cases;
- Recommendation golden cases.

### Reliability

- backup restore test;
- queue recovery;
- deletion cascade;
- runtime resume;
- generated experience rollback.

### Product

- student onboarding end-to-end;
- chat import end-to-end;
- teacher finding → intervention;
- live experience launch;
- feedback loop.

---

# 140. Gates antes de escalar institucionalmente

- DPA/privacy review;
- penetration test;
- formal incident response;
- documented retention;
- provider agreements;
- access review process;
- audit log retention;
- SLO monitoring;
- model/provider change process;
- institutional export validation.

---

# 141. Riesgos técnicos principales

## R1 — Semantic drift

Diferentes versiones de modelos cambian mappings.

**Mitigación:** versioning + evals + reprocessing controlado.

## R2 — False precision

Outputs semánticos parecen más ciertos de lo que son.

**Mitigación:** structural thresholds, uncertainty states, lineage.

## R3 — Privacy leak docente

Un join o endpoint expone identidad.

**Mitigación:** separate aggregate DTO/API + tests + small-cell suppression.

## R4 — Generated code escape

Experiencia intenta acceder a red/secretos.

**Mitigación:** static frontend-only, builder sandbox, separate origin, restricted SDK.

## R5 — Evidence contamination

Hints revelan respuesta y siguen contando como independencia.

**Mitigación:** assistance state + opportunity contract + server-side event lineage.

## R6 — Queue lag

Feedback académico tarda demasiado.

**Mitigación:** priority queues + synchronous deterministic feedback where possible.

## R7 — Cost explosion

Cada interacción dispara modelos caros.

**Mitigación:** task routing + batching + caching + budgets + instrumentation.

## R8 — RAG cross-course leakage

Retriever trae material de otra cátedra.

**Mitigación:** mandatory scoped filters + tests.

---

# 142. Hipótesis técnicas a validar

No considerar cerradas:

- Redis/BullMQ será suficiente para toda la fase piloto;
- pgvector mantendrá latencia/recall aceptables;
- `min_group_size = 5` es suficiente para anonimato operativo;
- iframe sin `allow-same-origin` soportará todos los formatos necesarios;
- generated frontend-only cubre las simulaciones del MVP;
- 72h es una buena ventana de resume;
- 7 días es buen threshold de assessment proximity;
- SLOs propuestos son adecuados;
- TypeScript end-to-end maximiza velocidad del equipo;
- builds generados pueden completarse con una latencia tolerable para docentes.

Todos deben medirse.

---

# 143. Decisiones que NO deben quedar a Claude Code/Codex

Los agentes de implementación no deben decidir por su cuenta:

- quién puede ver datos individuales;
- thresholds de estados académicos;
- reglas de anonimato;
- permisos de Runtime;
- dependencias permitidas;
- secretos;
- políticas de retención;
- qué eventos cuentan como evidencia;
- versioning strategy;
- source deletion semantics;
- reglas de prioridad hard constraint.

Estas decisiones pertenecen a contratos de producto/arquitectura.

---

# 144. Qué sí pueden decidir los agentes

Dentro de contratos aprobados:

- estructura interna de componentes;
- implementación de tests;
- refactors;
- estilos UI;
- optimizaciones locales;
- generación de simulaciones;
- fixtures;
- documentación técnica;
- adapter code.

Siempre sujetos a CI, tests y code review.

---

# 145. Arquitectura final simplificada

```text
                        ┌────────────────────────┐
                        │      EDUCAI WEB        │
                        │ Student / Teacher      │
                        └───────────┬────────────┘
                                    │
                                    ↓
                        ┌────────────────────────┐
                        │    APPLICATION API     │
                        │ Modular Monolith       │
                        └──────┬──────┬─────────┘
                               │      │
                  ┌────────────┘      └──────────────┐
                  ↓                                  ↓
        ┌──────────────────┐                ┌──────────────────┐
        │ PostgreSQL       │                │ Object Storage   │
        │ + pgvector       │                │ Files / Bundles  │
        └───────┬──────────┘                └──────────────────┘
                │
                ↓ Outbox
        ┌──────────────────┐
        │ Queue / Workers  │
        └───────┬──────────┘
                │
     ┌──────────┼───────────┬──────────────┐
     ↓          ↓           ↓              ↓
 Evidence  Interpretation Recommendation  AI/RAG
     │          │           │
     └──────────┴──────┬────┘
                       ↓
               Experience Engine
                       ↓
             ┌────────────────────┐
             │ Isolated Builder   │
             │ Claude/Codex       │
             └─────────┬──────────┘
                       ↓
              immutable static bundle
                       ↓
             ┌────────────────────┐
             │ Runtime Origin     │
             │ Sandbox + SDK      │
             └─────────┬──────────┘
                       ↓
                   Events
                       ↓
                 Evidence loop
```

---

# 146. Definición final

> **La arquitectura de Educai debe preservar la trazabilidad completa desde una acción educativa hasta la próxima decisión, manteniendo la semántica flexible en modelos de IA y las invariantes críticas en código determinista.**

El sistema no debe depender de que un único modelo “entienda todo”.

Debe construir una cadena verificable:

```text
currícula validada
↓
acción real
↓
evento
↓
evidencia
↓
interpretación
↓
recomendación
↓
experiencia
↓
nueva acción real
```

La decisión arquitectónica principal para v1 es:

> **core modular monolith + asynchronous workers + PostgreSQL as source of truth + isolated generated-experience runtime.**

Esta combinación maximiza velocidad de construcción sin sacrificar las propiedades que realmente importan para Educai:

- aislamiento por cátedra;
- privacidad;
- trazabilidad;
- re-procesabilidad;
- calidad pedagógica;
- seguridad del código generado;
- capacidad de evolucionar los motores sin perder evidencia histórica.

---

# 147. Próximos documentos técnicos recomendados

Con esta arquitectura definida, los siguientes documentos de implementación deberían ser:

1. **Data Model & Database Schema** — tablas, constraints, índices, RLS y migraciones.
2. **API & Event Contracts** — OpenAPI + schemas de eventos + errores.
3. **AI Gateway & Prompt Architecture** — tasks, routing, prompt registry, structured outputs y evals.
4. **Privacy & Security Specification** — RBAC/ABAC, threat model, retention, deletion y audit.
5. **Experience SDK Specification** — API exacta del bridge, tokens, event schema y sandbox.
6. **Implementation Backlog** — épicas, historias, dependencias y Definition of Done.

Estos documentos ya no deberían cambiar la tesis del producto: deben traducir la arquitectura acordada a contratos ejecutables para el equipo y los agentes de programación.
