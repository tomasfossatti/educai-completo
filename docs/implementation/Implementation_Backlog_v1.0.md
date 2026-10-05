# Educai — Implementation Backlog

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo:** Engineering Delivery Plan  
**Estado:** Backlog inicial listo para ejecución  
**Dependencias:** PRD + Technical Architecture + Data Model + API/Event Contracts + UX/UI Spec

---

# 0. Objetivo

Este backlog convierte la arquitectura en unidades de trabajo ejecutables por desarrolladores y agentes como Claude Code/Codex.

Regla operativa:

> **No asignar “construí Educai”. Asignar una story acotada, con contratos, dependencias, tests y Definition of Done explícitos.**

---

# 1. Prioridades

```text
P0  imprescindible para loop end-to-end / seguridad básica
P1  imprescindible para piloto completo
P2  puede entrar después del primer piloto sin romper tesis
```

Estados:

```text
READY
IN_PROGRESS
BLOCKED
REVIEW
DONE
```

---

# 2. Definition of Ready

Una story puede entrar a implementación cuando tiene:

- objetivo claro;
- dependencias resueltas;
- schema/API relevante definido;
- UX state definido cuando hay UI;
- criterios de aceptación verificables;
- privacy/authorization identificados;
- fixtures necesarios disponibles.

---

# 3. Definition of Done global

Feature core:

- implementación;
- migration/schema;
- authorization;
- validation;
- domain tests;
- API/contract tests;
- error states;
- observability;
- product analytics;
- privacy review;
- documentación.

Feature IA agrega:

- task ID;
- prompt/model version;
- structured output validation;
- eval cases;
- fallback;
- latency/cost telemetry.

Runtime agrega:

- contract tests;
- instrumentation completeness;
- security scan;
- accessibility smoke test;
- crash/resume test.

---

# 4. Critical path

```text
EPIC 00 Foundations
↓
EPIC 01 Identity + Academic Structure
↓
EPIC 02 Curriculum
↓
EPIC 03 Learning Sources + AI Chat
↓
EPIC 04 Evidence
↓
EPIC 05 Interpretation
↓
EPIC 06 Recommendation
↓
EPIC 07 Student Core
↓
EPIC 08 Teacher Core
↓
EPIC 09 Experience Runtime
↓
EPIC 10 Generated Experiences
↓
EPIC 11 Institution Minimal
```

Student/Teacher UI puede avanzar en paralelo con mocks una vez congelados API contracts.

---

# 5. EPIC 00 — Foundations [P0]

## EDU-0001 — Monorepo y workspace

**Objetivo:** crear estructura base.

Entregables:

```text
/apps/web
/apps/api
/apps/worker
/apps/experience-builder
/packages/db
/packages/contracts
/packages/domain
/packages/ai
/packages/ui
/packages/testing
```

Aceptación:

- build root exitoso;
- typecheck compartido;
- lint;
- test runner;
- package boundaries documentadas.

Dependencias: ninguna.

## EDU-0002 — Environments y config

- development/staging/production;
- config validation al boot;
- secrets solo desde provider/env seguro;
- ningún secret en browser bundle.

## EDU-0003 — PostgreSQL + Drizzle + migrations

- conexión;
- migration runner;
- schema namespaces;
- health check;
- seed sintético.

## EDU-0004 — Redis/BullMQ

- queue client;
- worker bootstrap;
- retry policy;
- dead-letter convention;
- dashboard interno restringido o logs suficientes.

## EDU-0005 — Object Storage

- pre-signed upload/download;
- object registry;
- content hash;
- scan status hook.

## EDU-0006 — Transactional outbox

- tabla;
- publisher worker;
- idempotent event publish;
- correlation IDs.

## EDU-0007 — Observability

- structured logs;
- OpenTelemetry tracing;
- request ID/correlation ID;
- error tracking;
- queue metrics.

## EDU-0008 — CI/CD base

- typecheck;
- lint;
- unit;
- contract;
- build;
- preview;
- staging deployment.

---

# 6. EPIC 01 — Identity & Academic Structure [P0]

## EDU-0101 — Auth integration

- login/logout/session;
- user bootstrap;
- role resolution.

## EDU-0102 — Institutions

CRUD mínimo operator/admin.

## EDU-0103 — Subjects y CourseSections

- crear materia;
- crear cátedra;
- status lifecycle.

## EDU-0104 — Teacher assignments

- owner/teacher/assistant;
- authorization tests.

## EDU-0105 — Enrollment

- join code;
- invite link;
- QR deep-link;
- active/withdrawn.

Aceptación crítica:

> Un alumno puede unirse a una segunda cátedra sin repetir onboarding.

## EDU-0106 — Class sessions + milestones

- clases planificadas;
- parciales/hitos;
- class close skeleton.

## EDU-0107 — RLS/authorization baseline

Negative tests cross-student/cross-course.

---

# 7. EPIC 02 — Curriculum [P0]

## EDU-0201 — Material upload

- programa/PDFs;
- storage;
- security scan;
- processing status.

## EDU-0202 — Document parse/chunk

- text extraction;
- page refs;
- chunks;
- hashes.

## EDU-0203 — Embeddings/RAG indexing

- scoped by course_section;
- pgvector;
- retrieval tests cross-course.

## EDU-0204 — Curriculum extraction task

Structured output:

- nodes;
- concepts;
- outcomes.

Incluye eval fixtures.

## EDU-0205 — Capability generation task

- observable;
- atomic;
- cognitive level;
- source refs.

## EDU-0206 — Curriculum review UI

Implementa “Así entendimos tu materia”.

## EDU-0207 — Curriculum version activation

- optimistic concurrency;
- unique active version;
- supersede prior version.

## EDU-0208 — Prerequisite graph validation

- no self-edge;
- cycle detection.

---

# 8. EPIC 03 — Learning Sources & AI Chat [P0]

## EDU-0301 — SourceArtifact service

- create;
- status;
- lineage root;
- content hash.

## EDU-0302 — Integrated student conversation

- create conversation;
- persist student message before inference;
- streaming assistant;
- course scope.

## EDU-0303 — Learning vs evidence behavior

- assistance metadata;
- answer reveal flag;
- mode switching server-side.

## EDU-0304 — External transcript upload

- TXT/MD;
- scan;
- parse roles;
- confirmation screen.

## EDU-0305 — RawInteraction normalization

- student/assistant/system;
- sequence;
- source pointers.

## EDU-0306 — Delete source operation

- mark deleted;
- enqueue invalidation;
- operation status.

---

# 9. EPIC 04 — Evidence Engine [P0]

## EDU-0401 — Opportunity model

- independence group;
- attempts;
- prior feedback.

## EDU-0402 — Evidence extraction pipeline

Input RawInteraction/RuntimeEvent → EvidenceEvent.

## EDU-0403 — Capability mapper

- mapping confidence;
- source spans;
- conservative threshold.

## EDU-0404 — Assistance/provenance quality

- quality band;
- state eligibility.

## EDU-0405 — Dedupe

- exact hash;
- duplicate source handling;
- no double count.

## EDU-0406 — Evidence invalidation

- source deletion;
- bad opportunity;
- curriculum change.

## EDU-0407 — Evidence golden dataset

Casos:

- independent correct;
- answer revealed;
- ambiguous;
- misconception;
- imported incomplete;
- duplicate.

Gate P0: mapping eval acordado antes del piloto.

---

# 10. EPIC 05 — Interpretation Engine [P0]

## EDU-0501 — Eligibility + opportunity normalization

## EDU-0502 — Evidence sufficiency

## EDU-0503 — Maturity state

`unknown/developing/solid`.

## EDU-0504 — ErrorPattern lifecycle

`candidate/confirmed/resolved`.

## EDU-0505 — Attention state

`none/review`.

## EDU-0506 — Contradictions

level/context/source/temporal.

## EDU-0507 — Next evidence need

## EDU-0508 — Interpretation history

Snapshot y transition lineage.

## EDU-0509 — Recompute worker

Idempotente/versionado.

## EDU-0510 — Golden cases

Debe probar explícitamente:

- una correcta no crea solid;
- una incorrecta no crea review;
- 2 oportunidades consistentes pueden crear solid;
- error confirmado activa review;
- error resuelto sale de review;
- source deletion recalcula.

---

# 11. EPIC 06 — Recommendation Engine [P0]

## EDU-0601 — Section candidate generation

## EDU-0602 — Priority policy

- teacher required;
- resume;
- assessment urgency;
- review;
- evidence need;
- advance;
- transfer.

## EDU-0603 — Global Student Orchestrator

Compara metadata, no evidence cross-course.

## EDU-0604 — Explanation builder

“¿Por qué esto?”.

## EDU-0605 — Recommendation lifecycle

surfaced/started/completed/dismissed/disagreed/expired/superseded.

## EDU-0606 — Teacher aggregate recommendation

Solo projections.

## EDU-0607 — Recommendation golden cases

resume vs exam, prerequisite, no evidence, solid→transfer, teacher required.

---

# 12. EPIC 07 — Student Product [P1]

## EDU-0701 — Onboarding shell

5 etapas + autosave.

## EDU-0702 — Onboarding question components

cards, forced choice, text, dimensions, scenarios.

## EDU-0703 — Onboarding processing/profile v1

## EDU-0704 — Student Home

- next action;
- resume;
- pending;
- loading/error/no action.

## EDU-0705 — Why recommendation

+ disagree flow.

## EDU-0706 — Mis materias

## EDU-0707 — Course Home

- objetivo;
- cómo venís;
- capacidades;
- recorrido;
- next action.

## EDU-0708 — Capability/evidence detail

## EDU-0709 — AI chat UI

## EDU-0710 — External transcript flow UI

## EDU-0711 — Feedback post-action

## EDU-0712 — Projects

create/edit/personalization consent.

## EDU-0713 — Mi perfil

## EDU-0714 — Profile history

## EDU-0715 — Privacy / data sources

## EDU-0716 — Data deletion/recompute UX

## EDU-0717 — Student responsive/accessibility pass

Gate: onboarding → join → chat → evidence → recommendation funciona end-to-end.

---

# 13. EPIC 08 — Teacher Product [P1]

## EDU-0801 — Teacher selector

Materias/cátedras.

## EDU-0802 — Course setup wizard

## EDU-0803 — Teacher Home API projection

## EDU-0804 — Teacher Home UI

## EDU-0805 — Learning map aggregate

## EDU-0806 — Finding detail + traceability

## EDU-0807 — Finding validation

## EDU-0808 — Cronograma

## EDU-0809 — Cerrar clase

## EDU-0810 — Class feedback collection student

## EDU-0811 — Feedback aggregation

## EDU-0812 — Tu aula

aggregate profile/context only.

## EDU-0813 — Teacher assistant core

course-scoped tools.

## EDU-0814 — Prepare next class

## EDU-0815 — Generated artifacts: slides/materials [P1]

## EDU-0816 — Small-cell suppression tests

Gate: finding → intervention decision puede completarse sin exponer identidad.

---

# 14. EPIC 09 — Experience Runtime [P1]

## EDU-0901 — ExperienceSpec persistence

## EDU-0902 — Trusted Runtime shell

Separate origin.

## EDU-0903 — Runtime session tokens

Short-lived, scoped.

## EDU-0904 — Experience SDK v1 minimal

- getContext;
- saveState;
- events.emit;
- requestHint;
- feedback.show;
- complete.

## EDU-0905 — Runtime event ingestion

- batch;
- sequence;
- idempotency.

## EDU-0906 — Session state/resume

## EDU-0907 — Declarative decision scenario

Primer formato instrumentado.

## EDU-0908 — Branching case

## EDU-0909 — Conversational runtime

## EDU-0910 — Teacher launch

QR/code/link.

## EDU-0911 — Live aggregate SSE

## EDU-0912 — Runtime → Evidence bridge

## EDU-0913 — Accessibility/responsive contract suite

Gate: launch → student action → runtime events → evidence funciona.

---

# 15. EPIC 10 — Generated Experiences [P1/P2]

## EDU-1001 — Experience planner

Recommendation → ExperienceSpec.

## EDU-1002 — Builder sandbox

No prod secrets, network restrictions, CPU/memory/time limits.

## EDU-1003 — Claude Code/Codex adapter

Provider-agnostic interface.

## EDU-1004 — Generated test manifest

## EDU-1005 — Dependency allowlist

## EDU-1006 — Static analysis + security scan

## EDU-1007 — Instrumentation tests

## EDU-1008 — Preview + publish immutable bundle

## EDU-1009 — Rollback/invalidation

## EDU-1010 — Fallback simple experience

Si avanzada falla, preservar objetivo/evidence contract.

## EDU-1011 — Parameter simulation [P2]

## EDU-1012 — Artifact runtime [P2]

## EDU-1013 — 2D systems [P2]

## EDU-1014 — 3D/physics [P2]

No bloquear piloto por 3D.

---

# 16. EPIC 11 — Privacy & Security hardening [P1]

Debe avanzar transversalmente, no al final.

## EDU-1101 — Permission matrix tests

## EDU-1102 — Teacher anonymity contract tests

## EDU-1103 — Small-cell suppression

## EDU-1104 — Upload scanning

## EDU-1105 — Audit log

## EDU-1106 — Operator JIT access

## EDU-1107 — Data export

## EDU-1108 — Account deletion cascade

## EDU-1109 — Backup/restore drill

## EDU-1110 — Runtime isolation security tests

---

# 17. EPIC 12 — Institution Minimal [P2]

## EDU-1201 — Institutional aggregate projection

## EDU-1202 — Impact endpoint

## EDU-1203 — Read-only impact page

## EDU-1204 — Export report

No individual drilldown.

---

# 18. EPIC 13 — Analytics & Engine Quality [P1]

## EDU-1301 — Product analytics pipeline

## EDU-1302 — Closed Learning Loop metric

## EDU-1303 — Capability Progression metric

## EDU-1304 — Evidence Coverage

## EDU-1305 — Recommendation acceptance

## EDU-1306 — Teacher intervention rate

## EDU-1307 — Engine eval runner

## EDU-1308 — Prompt/model version telemetry

---

# 19. EPIC 14 — Internal Operations [P1]

## EDU-1401 — Job status console

## EDU-1402 — Failed pipeline view

## EDU-1403 — Reprocess source

## EDU-1404 — Recompute section interpretations

## EDU-1405 — Regenerate recommendations

## EDU-1406 — Experience invalidation

Todo auditado; no convertir manual SQL en operación normal.

---

# 20. Primer vertical slice obligatorio

Antes de construir el producto completo, implementar un flujo end-to-end estrecho:

```text
1. Teacher crea cátedra
2. Carga programa simple
3. Se activa una currícula con 3–5 capabilities
4. Student se une
5. Student conversa con IA
6. RawInteraction persiste
7. Evidence Engine genera signal
8. Interpretation calcula estado
9. Recommendation produce next action
10. Student Home lo muestra
11. Student abre “¿Por qué?”
```

Criterio:

> Si este slice no es trazable y confiable, no avanzar a simulaciones sofisticadas.

---

# 21. Segundo vertical slice

```text
1. Teacher Home detecta una dificultad agregada
2. Abre finding
3. Ve n/N y rationale
4. Genera experiencia simple instrumentada
5. La lanza
6. Estudiantes responden
7. Runtime emite eventos
8. Evidence actualiza
9. Interpretation cambia
10. Teacher projection se refresca
```

Este slice valida el loop docente completo.

---

# 22. Parallel workstreams

Después de EPIC 00–02, se pueden ejecutar en paralelo:

```text
Track A: Evidence/Interpretation/Recommendation
Track B: Student UI contra mocks/contracts
Track C: Teacher UI contra mocks/contracts
Track D: Runtime shell/SDK
Track E: Privacy/security tests
```

Merge únicamente contra contratos versionados.

---

# 23. Milestone M0 — Repository boots

Incluye:

- CI;
- auth skeleton;
- DB;
- queue;
- storage;
- observability;
- synthetic seed.

---

# 24. Milestone M1 — Academic intelligence works

Incluye:

- curriculum;
- chat/transcript;
- evidence;
- interpretation;
- recommendation;
- golden tests.

No requiere UI final.

---

# 25. Milestone M2 — Student usable

Incluye:

- onboarding;
- join;
- Home;
- materias;
- chat;
- transcript;
- capability progress;
- profile;
- privacy.

---

# 26. Milestone M3 — Teacher usable

Incluye:

- setup;
- Home;
- learning map;
- findings;
- cronograma;
- close class;
- feedback;
- assistant básico.

---

# 27. Milestone M4 — Experience loop

Incluye:

- runtime;
- launch;
- decision scenario;
- live aggregate;
- evidence bridge;
- resume.

---

# 28. Milestone M5 — Generated experiences

Incluye:

- builder;
- Claude/Codex;
- tests;
- sandbox;
- preview;
- publish;
- fallback.

---

# 29. Milestone M6 — Pilot ready

Gates obligatorios:

### Security

- auth audit;
- permission tests;
- teacher anonymity tests;
- upload scanning;
- secret scan;
- runtime isolation.

### Academic

- curriculum extraction review;
- evidence mapping eval;
- interpretation golden cases;
- recommendation golden cases.

### Reliability

- backup restore;
- queue recovery;
- deletion cascade;
- runtime resume;
- experience rollback.

### Product

- onboarding E2E;
- chat import E2E;
- student next action E2E;
- teacher finding → intervention E2E;
- live launch E2E;
- feedback loop.

---

# 30. Story template para Claude Code/Codex

Cada tarea entregada a un agente debe incluir:

```text
Story ID
Objetivo
Contexto de dominio
Documentos fuente
Contratos relevantes
Archivos/módulos permitidos
No objetivos
Acceptance criteria
Tests obligatorios
Privacy/security invariants
Definition of Done
```

Ejemplo:

```text
EDU-0505 Attention state

Objetivo:
Implementar derivación attention_state = review cuando existe un ErrorPattern confirmed y no resuelto.

No objetivos:
No modificar Evidence Engine.
No cambiar thresholds.
No generar recomendaciones.

Tests:
confirmed unresolved -> review
candidate -> none
resolved -> none
single negative signal -> none
```

---

# 31. Reglas para agentes de programación

- no modificar contratos sin RFC/ADR;
- no introducir dependencia nueva sin justificar;
- no cambiar privacy boundary;
- no usar datos de otra cátedra;
- no inventar estados académicos;
- no sustituir tests por comentarios;
- no ejecutar migrations destructivas automáticamente;
- no saltar quality gates del Runtime;
- si falta decisión de producto, marcar `BLOCKED`, no improvisar.

---

# 32. Qué puede diferirse después del piloto

P2 explícitos:

- institution UI rica;
- 3D/physics;
- native mobile apps;
- integrations profundas LMS;
- marketplace;
- credenciales públicas;
- advanced BI;
- data warehouse separado;
- RL/autonomous policy optimization.

---

# 33. Métricas de delivery

No optimizar por tickets cerrados solamente.

Monitorear:

- lead time por story;
- defect escape;
- contract failures;
- eval regression;
- queue/job failures;
- security findings;
- end-to-end critical path status.

---

# 34. Orden inmediato recomendado

Primeras stories:

```text
EDU-0001 monorepo
EDU-0002 config
EDU-0003 DB/migrations
EDU-0004 queue
EDU-0005 storage
EDU-0006 outbox
EDU-0007 observability
EDU-0101 auth
EDU-0103 subjects/course sections
EDU-0105 enrollment
EDU-0201 materials
EDU-0202 parse/chunk
```

En paralelo, frontend puede comenzar design system/Storybook y pantallas contra fixtures.

---

# 35. Criterio de finalización de este backlog

Este backlog no está “terminado” cuando todos los tickets existen. Está listo para ejecución cuando:

1. los primeros dos milestones tienen stories READY;
2. contracts están versionados;
3. fixtures permiten desarrollar sin producción;
4. agentes reciben tareas pequeñas y testeables;
5. existe un proceso para convertir edge cases descubiertos en nuevas stories sin reescribir la tesis.

> **El backlog debe reducir ambigüedad de ejecución, no fingir que podemos predecir cada detalle del producto antes de observarlo funcionando.**
