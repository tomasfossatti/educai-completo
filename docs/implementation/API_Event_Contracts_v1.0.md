# Educai — API & Event Contracts

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo:** HTTP API + Async Event Contract  
**Estado:** Especificación para implementación  
**Dependencias:** Technical Architecture v1.0 + Data Model v1.0

---

# 0. Propósito

Este documento define los contratos que separan frontend, Application API, workers, Runtime de Experiencias y motores académicos. Su objetivo es que distintos agentes o desarrolladores puedan implementar componentes sin inventar payloads incompatibles.

> **REST JSON + OpenAPI es el contrato síncrono. JSON Schema versionado es el contrato de eventos. SSE se utiliza para progreso y agregados en vivo.**

---

# 1. Reglas generales HTTP

Base:

```text
/v1
Content-Type: application/json
```

IDs como UUID string.

Timestamps ISO-8601 UTC.

No devolver columnas DB directamente; usar DTOs estables.

Toda mutación sensible debe validar authorization server-side incluso si el frontend oculta la acción.

---

# 2. Autenticación

La aplicación principal usa sesión autenticada segura mediante proveedor de identidad elegido.

Headers internos conceptuales:

```text
Authorization: Bearer <access_token>
X-Request-Id: <uuid>
Idempotency-Key: <client-generated-key>   # en mutaciones declaradas idempotentes
```

El Runtime usa un **runtime session token** de corta duración con scopes explícitos.

Nunca enviar API keys de proveedores IA al browser.

---

# 3. Envelope de error

Todos los endpoints JSON utilizan:

```json
{
  "error": {
    "code": "COURSE_SECTION_FORBIDDEN",
    "message": "No tenés acceso a esta cátedra.",
    "request_id": "req_...",
    "details": {}
  }
}
```

Códigos HTTP:

```text
400 invalid_request
401 unauthenticated
403 forbidden
404 not_found
409 conflict
413 payload_too_large
422 domain_validation_failed
429 rate_limited
500 internal_error
503 dependency_unavailable
```

No filtrar detalles internos, SQL, prompts ni IDs sensibles en `message`.

---

# 4. Paginación

Colecciones grandes usan cursor:

```text
?limit=50&cursor=opaque
```

Respuesta:

```json
{
  "items": [],
  "next_cursor": null
}
```

No utilizar offset para logs/eventos de alto volumen.

---

# 5. Concurrencia y versionado

Recursos editables relevantes incluyen `version` o `updated_at`.

Para currícula y experience specs se recomienda optimistic concurrency:

```text
If-Match: "<version>"
```

o `expected_version` en body.

Una versión publicada de experiencia no se edita; se crea nueva versión.

---

# 6. Endpoint compuesto de Home estudiante

## `GET /v1/me/home`

Objetivo: responder la Home con un único round trip.

Response:

```json
{
  "student": {
    "display_name": "Tomás"
  },
  "next_action": {
    "recommendation_id": "...",
    "title": "Aplicá segmentación a tu proyecto",
    "reason_short": "Ya comprendés el concepto; falta evidencia de aplicación.",
    "estimated_minutes": 15,
    "course_section": {"id":"...","subject_name":"Marketing"},
    "cta": {"label":"Empezar","href":"..."},
    "why_available": true
  },
  "resume": {
    "session_id": "...",
    "title": "Continuar validación de hipótesis",
    "last_activity_at": "..."
  },
  "other_pending": []
}
```

Estados permitidos:

- `next_action = null` si no hay recomendación válida;
- `resume = null` si no existe sesión reanudable.

Nunca incluir evidence raw de otras materias para justificar el ranking global.

---

# 7. Materias del estudiante

## `GET /v1/me/course-sections`

Devuelve cátedras activas con metadata mínima.

## `POST /v1/course-sections/join`

Request:

```json
{"code":"ABCD12"}
```

Response incluye `course_section_id` y estado de enrollment.

El onboarding global no se repite al unirse.

---

# 8. Learning map estudiante

## `GET /v1/course-sections/{id}/learning-map`

Solo el estudiante autenticado y enrolado.

Response conceptual:

```json
{
  "course_section_id": "...",
  "objective_current": {...},
  "capabilities": [
    {
      "capability_id":"...",
      "statement":"Diferenciar PO y Scrum Master",
      "visible_state":"in_development",
      "highest_level":"apply",
      "explanation_short":"...",
      "evidence_detail_available":true
    }
  ],
  "journey": {
    "current_stage":"solve",
    "stages":["understand","apply","solve","transfer"]
  }
}
```

No devolver scores porcentuales de comprensión.

---

# 9. Recomendaciones estudiante

## `GET /v1/recommendations/next`

Opcional `?course_section_id=` para recomendación dentro de una materia.

## `GET /v1/recommendations/{id}`

Incluye explicación completa y lineage autorizado.

## `POST /v1/recommendations/{id}/start`

Idempotente.

Response puede crear/retornar `experience_session`, `conversation`, o route según `action_type`.

## `POST /v1/recommendations/{id}/disagree`

```json
{
  "reason_code":"INTERPRETATION_DOES_NOT_MATCH",
  "comment":"Creo que ya puedo aplicarlo sin ayuda."
}
```

No cambia automáticamente CapabilityInterpretation. Genera feedback para recalibración y puede solicitar evidencia adicional.

## `POST /v1/recommendations/{id}/dismiss`

Para recomendaciones no obligatorias.

---

# 10. IA integrada del estudiante

## `POST /v1/conversations`

```json
{
  "course_section_id":"...",
  "mode":"learning",
  "entry_context": {
    "recommendation_id":"...",
    "capability_ids":["..."]
  }
}
```

## `POST /v1/conversations/{id}/messages`

```json
{
  "content":"No entiendo por qué el Scrum Master no prioriza el backlog.",
  "client_message_id":"..."
}
```

Response puede ser síncrona o stream; el mensaje persistido tiene ID antes de iniciar inferencia.

SSE sugerido:

```text
GET /v1/conversations/{id}/stream
```

Eventos de stream:

```text
assistant.delta
assistant.completed
assistant.failed
processing.evidence_started
processing.evidence_completed
```

No exponer prompts del sistema.

---

# 11. Importación de transcript externo

Flujo recomendado pre-signed upload:

## `POST /v1/uploads`

Solicita upload.

```json
{
  "purpose":"external_ai_transcript",
  "filename":"chat.md",
  "mime_type":"text/markdown",
  "size_bytes":12034,
  "course_section_id":"..."
}
```

Response devuelve URL firmada y `upload_id`.

## `POST /v1/uploads/{upload_id}/complete`

Confirma upload y dispara scan/parse.

## `GET /v1/uploads/{upload_id}`

Estado:

```text
uploaded
scanning
parsing
needs_confirmation
processing_evidence
ready
failed
rejected
```

## `POST /v1/uploads/{upload_id}/confirm-transcript`

Permite confirmar roles detectados y materia antes de producir evidence.

---

# 12. Evidencia propia del estudiante

## `GET /v1/me/capabilities/{capabilityId}/evidence`

Devuelve explicación y fuentes propias autorizadas.

Debe aplicar progressive disclosure:

```json
{
  "capability": {...},
  "state": "in_development",
  "summary": "...",
  "evidence_items": [
    {
      "type":"interactive_experience",
      "occurred_at":"...",
      "summary":"Resolviste 2 de 3 situaciones sin ayuda.",
      "source_link":"..."
    }
  ]
}
```

---

# 13. Perfil y onboarding

## `GET /v1/me/onboarding`

Devuelve etapa, respuestas y progreso.

## `PUT /v1/me/onboarding/responses/{questionKey}`

Autoguardado idempotente.

## `POST /v1/me/onboarding/complete`

Valida requisitos y encola construcción de profile v1.

## `GET /v1/me/profile`

Devuelve perfil global actual.

## `GET /v1/me/profile/history`

Progressive disclosure.

## `PATCH /v1/me/profile/context`

Solo información explícitamente editable; no permite editar directamente inferencias calculadas.

---

# 14. Proyectos

```text
GET    /v1/projects
POST   /v1/projects
GET    /v1/projects/{id}
PATCH  /v1/projects/{id}
POST   /v1/projects/{id}/archive
POST   /v1/projects/{id}/assets
```

Authorization: owner only salvo share explícito de un resultado.

---

# 15. Privacidad y datos

```text
GET    /v1/me/privacy
GET    /v1/me/data-sources
DELETE /v1/me/data-sources/{sourceArtifactId}
POST   /v1/me/data-export
DELETE /v1/me/account
```

Eliminar una fuente responde `202 Accepted` si requiere recompute async.

Ejemplo:

```json
{
  "status":"deletion_processing",
  "operation_id":"..."
}
```

---

# 16. APIs docente — selección y Home

## `GET /v1/teacher/course-sections`

Solo cátedras asignadas.

## `GET /v1/teacher/course-sections/{id}/home`

```json
{
  "course_section": {...},
  "progress": {
    "class_index":4,
    "planned_classes":11,
    "next_milestone":"1° Parcial",
    "current_topic":"Scrum"
  },
  "priorities": [
    {
      "finding_id":"...",
      "headline":"44% necesita revisar Roles de Scrum",
      "detail":"Principal dificultad: Product Owner vs Scrum Master.",
      "evidence_sufficient_count":27,
      "rate":0.44,
      "recommended_intervention": {...}
    }
  ],
  "teaching_improvement": {...}
}
```

Nunca contiene estudiante + estado.

---

# 17. Currícula docente

```text
GET  /v1/teacher/course-sections/{id}/curriculum
POST /v1/teacher/course-sections/{id}/materials
POST /v1/teacher/course-sections/{id}/curriculum/generate
PATCH /v1/teacher/course-sections/{id}/curriculum/draft
POST /v1/teacher/course-sections/{id}/curriculum/activate
```

Activar requiere validación de constraints y versionado.

---

# 18. Mapa y findings docente

```text
GET /v1/teacher/course-sections/{id}/learning-map
GET /v1/teacher/course-sections/{id}/findings/{findingId}
POST /v1/teacher/findings/{findingId}/validate
```

Finding detail devuelve:

- n/N;
- patrones;
- tipos de fuentes;
- ejemplos anonimizados seguros;
- contradicciones agregadas;
- recomendación.

No devuelve `student_user_id`.

---

# 19. Cronograma y cerrar clase

```text
GET   /v1/teacher/course-sections/{id}/schedule
PATCH /v1/teacher/class-sessions/{id}
POST  /v1/teacher/class-sessions/{id}/close
```

Close request:

```json
{
  "actual_topic_node_ids":["..."],
  "activity_summary":"Simulación de roles Scrum",
  "pending_topic_node_ids":[],
  "comment":null,
  "operation_key":"..."
}
```

Genera eventos asíncronos para feedback/recommendation refresh.

---

# 20. Feedback docente

```text
GET /v1/teacher/course-sections/{id}/feedback
GET /v1/teacher/class-sessions/{id}/feedback-summary
```

Aplicar small-cell suppression.

---

# 21. Asistente docente

## `POST /v1/teacher/assistant/conversations`

Scope obligatorio `course_section_id`.

## `POST /v1/teacher/assistant/conversations/{id}/messages`

Puede invocar tools internas autorizadas para:

- preparar clase;
- crear spec de experiencia;
- generar slides/materiales;
- consultar currícula y findings agregados.

No existe tool para recuperar evidencia individual identificada.

---

# 22. Experiencias — autoría docente

```text
POST /v1/teacher/experiences/generate
GET  /v1/teacher/experiences/{id}
PATCH /v1/teacher/experience-specs/{id}
POST /v1/teacher/experiences/{id}/preview
POST /v1/teacher/experiences/{id}/publish
POST /v1/teacher/experiences/{id}/launch
POST /v1/teacher/launches/{id}/close
```

Generate request:

```json
{
  "course_section_id":"...",
  "recommendation_id":"...",
  "teacher_instruction":"Quiero que sea más orientada a debate.",
  "constraints":{"minutes":20,"devices":"phones"}
}
```

---

# 23. Runtime API

El Runtime se autentica con session token reducido.

## `POST /v1/runtime/sessions`

Invocado desde la app confiable para crear sesión. No desde bundle arbitrario sin bootstrap token.

## `GET /v1/runtime/sessions/{id}/context`

Contexto mínimo y autorizado.

## `PUT /v1/runtime/sessions/{id}/state`

Estado persistente, con límite de tamaño.

## `POST /v1/runtime/event-batches`

Request:

```json
{
  "session_id":"...",
  "batch_id":"...",
  "events":[
    {
      "event_id":"...",
      "sequence_no":12,
      "event_type":"response_submitted",
      "step_id":"step_2",
      "opportunity_id":"opp_1",
      "occurred_at":"...",
      "schema_version":"1.0",
      "payload":{}
    }
  ]
}
```

Response:

```json
{
  "accepted_through_sequence":12,
  "rejected":[]
}
```

Idempotente por `session + event_id/idempotency_key`.

## `POST /v1/runtime/sessions/{id}/hints`

Servidor registra assistance antes de retornar hint.

## `POST /v1/runtime/sessions/{id}/complete`

Valida completion rule server-side cuando corresponda.

---

# 24. Live dashboard docente

SSE:

```text
GET /v1/teacher/launches/{launchId}/stream
```

Eventos:

```text
launch.snapshot
launch.participant_count
launch.completion_count
launch.response_distribution
launch.closed
```

Payloads solo agregados.

---

# 25. Vista institucional mínima

```text
GET /v1/institutional/impact?period=...
```

Solo usuarios con rol institution_admin.

Devuelve:

- adoption;
- evidence coverage;
- aggregate capability progression;
- persistent difficulties;
- intervention utilization;
- perception.

Nunca drilldown individual.

---

# 26. Domain Event envelope

Eventos internos async usan:

```json
{
  "event_id":"...",
  "event_type":"evidence.signals_updated",
  "schema_version":"1.0",
  "occurred_at":"...",
  "producer":"evidence-worker",
  "aggregate_type":"source_artifact",
  "aggregate_id":"...",
  "course_section_id":"...",
  "correlation_id":"...",
  "causation_id":"...",
  "payload":{}
}
```

`correlation_id` se conserva a través del loop.

---

# 27. Catálogo de domain events v1

## Identity / academic

```text
academic.enrollment_activated
academic.enrollment_withdrawn
academic.class_closed
academic.milestone_changed
```

## Curriculum

```text
curriculum.material_ready
curriculum.version_activated
curriculum.version_superseded
curriculum.capability_changed
```

## Learning sources

```text
learning.source_created
learning.source_ready
learning.source_deleted
learning.conversation_closed
```

## Evidence

```text
evidence.processing_requested
evidence.signals_updated
evidence.source_invalidated
```

## Interpretation

```text
interpretation.recompute_requested
interpretation.updated
interpretation.error_pattern_confirmed
interpretation.error_pattern_resolved
```

## Recommendation

```text
recommendation.regenerate_requested
recommendation.generated
recommendation.superseded
recommendation.started
recommendation.completed
recommendation.disagreed
```

## Experience

```text
experience.generation_requested
experience.preview_ready
experience.published
experience.invalidated
experience.launch_opened
experience.launch_closed
experience.session_completed
```

## Reporting

```text
reporting.teacher_projection_refresh_requested
reporting.teacher_projection_updated
reporting.institutional_projection_updated
```

---

# 28. Event processing rules

1. Consumers son idempotentes.
2. Nunca asumir exactly-once delivery.
3. Outbox garantiza persistencia antes de publish.
4. Un consumer registra `processed_event_id` o utiliza operación idempotente.
5. Retries con backoff.
6. Dead-letter después de límite configurable.
7. Payloads no incluyen contenido sensible si basta con IDs.
8. Eventos no son APIs públicas; aun así llevan schema version.

---

# 29. Cadena académica canónica

```text
runtime.response_submitted
↓
learning/source interaction persisted
↓
evidence.processing_requested
↓
evidence.signals_updated
↓
interpretation.recompute_requested
↓
interpretation.updated
↓
recommendation.regenerate_requested
↓
recommendation.generated
↓
reporting.teacher_projection_refresh_requested
```

No bloquear la respuesta HTTP del alumno esperando toda la cadena salvo feedback determinista que pueda calcularse localmente.

---

# 30. Runtime event schema rules

Campos requeridos:

```text
event_id
session_id
experience_id/version derivable server-side
sequence_no
event_type
occurred_at
step_id optional
opportunity_id optional
payload
schema_version
```

El servidor agrega:

```text
student_user_id
course_section_id
received_at
runtime_token_subject
```

El bundle no puede elegir otro estudiante/cátedra.

---

# 31. Product analytics events

Separados del event bus académico.

Ejemplos:

```text
onboarding_started
onboarding_completed
recommendation_viewed
recommendation_started
recommendation_completed
recommendation_disagreed
session_resumed
external_chat_uploaded
project_created
profile_viewed
teacher_learning_insight_viewed
experience_launched
class_closed
```

No reutilizar `product_analytics_event` como EvidenceEvent.

---

# 32. Idempotency contracts

Endpoints que exigen `Idempotency-Key`:

- upload complete;
- recommendation start;
- class close;
- experience launch;
- runtime complete;
- account/data deletion request.

Server response para replay del mismo key debe ser semánticamente equivalente al primer éxito.

---

# 33. Rate limits iniciales

Deben ser configurables por ambiente/rol.

Categorías:

```text
authenticated_read
user_mutation
ai_message
upload
runtime_events
experience_generation
operator_action
```

No fijar cifras absolutas en contrato v1; medir antes del piloto.

---

# 34. Privacy invariants API

Tests contractuales obligatorios:

1. Teacher endpoints nunca serializan `student_user_id` junto a estado/evidencia.
2. Institution endpoint no admite `student_id` filter.
3. Student evidence endpoint verifica ownership.
4. Cross-course resource ID devuelve 404/403 sin filtrar existencia útil.
5. Runtime token no puede acceder a endpoints de app general.
6. Experience bundle no recibe secrets.
7. Small-cell suppression se aplica antes de serialización.

---

# 35. OpenAPI organization

```text
packages/contracts/openapi/student.yaml
packages/contracts/openapi/teacher.yaml
packages/contracts/openapi/runtime.yaml
packages/contracts/openapi/institutional.yaml
packages/contracts/schemas/events/*.json
packages/contracts/schemas/runtime/*.json
```

Generar tipos TypeScript desde contratos; no mantener tipos divergentes manualmente.

---

# 36. Contract tests

Cada endpoint tiene:

- success schema;
- validation failure;
- unauthorized;
- forbidden/cross-scope;
- not found;
- idempotency cuando aplica.

Cada evento tiene fixtures válidos e inválidos.

---

# 37. Criterios de aceptación

1. Frontend puede generarse contra OpenAPI sin leer DB schemas.
2. Workers consumen eventos versionados e idempotentes.
3. Runtime no necesita conocer modelos internos del core.
4. Un `correlation_id` permite rastrear acción → evidence → interpretation → recommendation.
5. Teacher APIs no pueden devolver identidades individuales por diseño del DTO.
6. Todos los eventos académicos relevantes soportan replay.
7. Los contratos cubren happy/error/permission states.
8. Los cambios incompatibles crean nueva versión de schema/endpoint.

> **Los contratos de API y eventos son la frontera que permite construir Educai en paralelo sin delegar semántica crítica a convenciones implícitas.**
