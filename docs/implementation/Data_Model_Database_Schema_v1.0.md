# Educai — Data Model & Database Schema

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo:** Database Design + Persistence Contract  
**Estado:** Especificación de implementación  
**Dependencias:** PRD Maestro v1.0 + Technical Architecture v1.0 + Curriculum/Evidence + Interpretation + Recommendation + Experience Runtime

---

# 0. Propósito

Este documento traduce el modelo conceptual de Educai a un esquema persistente para PostgreSQL. Define entidades, ownership, claves, versionado, constraints, índices, Row Level Security, lineage, invalidación y estrategia de migraciones.

El objetivo no es modelar cada detalle futuro, sino impedir que la implementación tome decisiones incompatibles con las invariantes centrales de Educai.

> **PostgreSQL es la fuente de verdad de estados y relaciones. Object Storage guarda archivos y bundles. Redis es efímero. Ninguna conclusión académica depende exclusivamente de cache.**

---

# 1. Decisiones rectoras

1. **PostgreSQL + pgvector** como base principal.
2. **Drizzle ORM + SQL explícito** para constraints, RLS, consultas agregadas y operaciones complejas.
3. IDs no secuenciales (`uuid` o ULID compatible). En v1 se recomienda `uuid` generado en aplicación o `gen_random_uuid()`.
4. Todas las tablas de dominio tienen `created_at`; las mutables tienen `updated_at`.
5. Objetos publicados o interpretaciones históricas no se sobrescriben destructivamente.
6. El aislamiento académico se expresa explícitamente mediante `course_section_id`.
7. El perfil global pertenece al estudiante y no a una cátedra.
8. Los datos visibles al docente se sirven desde proyecciones/agregadores, no mediante joins libres contra evidencia individual.
9. La eliminación de una fuente invalida sus derivados mediante lineage explícito.
10. JSONB se usa para payloads extensibles, no para esconder relaciones que requieren permisos, índices o constraints.

---

# 2. Namespaces lógicos

Para v1 se recomienda una única base PostgreSQL con schemas lógicos. Esto refuerza límites sin obligar a microservicios.

```text
iam             identidad, instituciones, roles y consentimientos
academic        materias, cátedras, inscripciones, clases e hitos
curriculum      currícula, capacidades, conceptos y materiales
profile         onboarding, perfil global y proyectos
learning        conversaciones y fuentes de aprendizaje
evidence        oportunidades, eventos, señales e invalidaciones
interpretation  estados, patrones de error y contradicciones
recommendation  recomendaciones, fuentes y feedback
experience      specs, versiones, bundles, lanzamientos y sesiones
feedback        feedback de clase y resúmenes
reporting       proyecciones agregadas y métricas institucionales
audit           outbox, auditoría y operaciones privilegiadas
```

Si el ORM dificulta schemas múltiples, se permite un solo schema físico con módulos de acceso estrictos. La semántica y los permisos definidos aquí deben mantenerse.

---

# 3. Convenciones de columnas

Campos comunes:

```text
id uuid primary key
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Reglas:

- timestamps siempre UTC;
- enums críticos como PostgreSQL enum o `text + check`, según estrategia de migración;
- dinero no es parte del core académico v1;
- hashes SHA-256 se guardan como `text` hexadecimal o `bytea`, consistentemente;
- blobs no se guardan en PostgreSQL;
- URLs firmadas nunca se persisten como fuente canónica;
- usar `jsonb` solo para estructuras versionadas o metadata específica de proveedor;
- todo payload JSONB debe tener `schema_version` cuando sea un contrato persistente.

---

# 4. Identidad y acceso

## 4.1. `iam.users`

```text
id uuid PK
email_normalized citext UNIQUE NOT NULL
display_name text NULL
auth_provider text NOT NULL
auth_provider_subject text NOT NULL
status text NOT NULL CHECK active|suspended|deleted
locale text NOT NULL DEFAULT 'es-AR'
timezone text NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
deleted_at timestamptz NULL
```

Constraint:

```text
UNIQUE(auth_provider, auth_provider_subject)
```

El email no debe propagarse a tablas académicas.

## 4.2. `iam.institutions`

```text
id uuid PK
name text NOT NULL
slug text UNIQUE NOT NULL
status text NOT NULL
settings jsonb NOT NULL DEFAULT '{}'
created_at
updated_at
```

## 4.3. `iam.institution_memberships`

```text
id uuid PK
institution_id uuid FK -> iam.institutions
user_id uuid FK -> iam.users
role text CHECK teacher|institution_admin|operator_delegate
status text
created_at
updated_at
UNIQUE(institution_id, user_id, role)
```

El rol estudiante se deriva principalmente de `academic.enrollments`, no de una membresía institucional genérica.

## 4.4. `iam.consents`

```text
id uuid PK
user_id uuid FK
consent_type text NOT NULL
policy_version text NOT NULL
granted boolean NOT NULL
captured_at timestamptz NOT NULL
revoked_at timestamptz NULL
metadata jsonb
```

---

# 5. Estructura académica

## 5.1. `academic.subjects`

Representa una materia como entidad organizadora.

```text
id uuid PK
institution_id uuid FK
name text NOT NULL
code text NULL
description text NULL
created_at
updated_at
UNIQUE(institution_id, code) WHERE code IS NOT NULL
```

## 5.2. `academic.course_sections`

La cátedra es el contenedor pedagógico aislado.

```text
id uuid PK
subject_id uuid FK
institution_id uuid FK
name text NOT NULL
term text NULL
status text CHECK draft|active|completed|archived
starts_on date NULL
ends_on date NULL
classroom_context jsonb NOT NULL DEFAULT '{}'
created_at
updated_at
```

Invariant:

> Toda evidencia académica individual debe poder resolverse a exactamente una `course_section_id`.

## 5.3. `academic.course_section_teachers`

```text
course_section_id uuid FK
teacher_user_id uuid FK
role text CHECK owner|teacher|assistant
created_at
PRIMARY KEY(course_section_id, teacher_user_id)
```

## 5.4. `academic.enrollments`

```text
id uuid PK
course_section_id uuid FK
student_user_id uuid FK
status text CHECK invited|active|withdrawn|completed
joined_at timestamptz NULL
left_at timestamptz NULL
created_at
updated_at
UNIQUE(course_section_id, student_user_id)
```

## 5.5. `academic.class_sessions`

```text
id uuid PK
course_section_id uuid FK
sequence_no integer NOT NULL
planned_start_at timestamptz NULL
planned_end_at timestamptz NULL
status text CHECK planned|open|closed|cancelled
planned_topic_node_ids uuid[] NULL
actual_topic_node_ids uuid[] NULL
teacher_note text NULL
closed_at timestamptz NULL
created_at
updated_at
UNIQUE(course_section_id, sequence_no)
```

Si se requiere integridad fuerte sobre topic IDs, normalizar luego con tablas join. En v1 el array es aceptable porque no define ownership.

## 5.6. `academic.milestones`

```text
id uuid PK
course_section_id uuid FK
type text CHECK exam|assignment|project|other
title text NOT NULL
starts_at timestamptz NULL
due_at timestamptz NULL
priority integer NOT NULL DEFAULT 0
metadata jsonb
created_at
updated_at
```

---

# 6. Currícula

## 6.1. `curriculum.curriculum_versions`

```text
id uuid PK
course_section_id uuid FK
version_no integer NOT NULL
status text CHECK draft|proposed|active|superseded|invalidated
created_by_user_id uuid NULL
source_summary text NULL
activated_at timestamptz NULL
superseded_at timestamptz NULL
created_at
UNIQUE(course_section_id, version_no)
```

Debe existir como máximo una versión `active` por cátedra.

Índice parcial:

```sql
CREATE UNIQUE INDEX curriculum_one_active_per_section
ON curriculum.curriculum_versions(course_section_id)
WHERE status = 'active';
```

## 6.2. `curriculum.curriculum_nodes`

```text
id uuid PK
curriculum_version_id uuid FK
course_section_id uuid FK
parent_id uuid NULL FK self
node_type text CHECK module|unit|reading|topic|subtopic
title text NOT NULL
description text NULL
sort_order integer NOT NULL
provenance text CHECK official_explicit|derived_from_material|teacher_added
status text CHECK active|superseded|removed
created_at
updated_at
```

Constraint de aplicación: `parent_id` debe pertenecer a la misma `curriculum_version_id`.

Índices:

```text
(curriculum_version_id, parent_id, sort_order)
(course_section_id, node_type)
```

## 6.3. `curriculum.concepts`

```text
id uuid PK
curriculum_version_id uuid FK
course_section_id uuid FK
name text NOT NULL
description text NULL
normalized_name text NOT NULL
created_at
UNIQUE(curriculum_version_id, normalized_name)
```

## 6.4. `curriculum.learning_outcomes`

```text
id uuid PK
curriculum_version_id uuid FK
course_section_id uuid FK
statement text NOT NULL
provenance text NOT NULL
created_at
```

## 6.5. `curriculum.capabilities`

Unidad académica central.

```text
id uuid PK
stable_key text NOT NULL
curriculum_version_id uuid FK
course_section_id uuid FK
statement text NOT NULL
action_verb text NOT NULL
object_text text NOT NULL
target_cognitive_level text CHECK recognize|explain|apply|solve|transfer
importance text CHECK low|medium|high|critical
provenance text CHECK official_explicit|derived|teacher_added
status text CHECK active|superseded|removed
created_at
updated_at
UNIQUE(curriculum_version_id, stable_key)
```

`stable_key` permite mapear una capacidad entre versiones cuando semánticamente sigue siendo la misma.

## 6.6. Relaciones curriculares

```text
curriculum.capability_nodes(capability_id, curriculum_node_id)
curriculum.capability_concepts(capability_id, concept_id)
curriculum.capability_outcomes(capability_id, learning_outcome_id)
curriculum.capability_prerequisites(capability_id, prerequisite_capability_id, criticality)
```

Constraints:

- no self prerequisite;
- evitar ciclos mediante validación de dominio antes de activar currícula;
- todas las relaciones pertenecen a la misma cátedra/versión activa salvo migración explícita.

---

# 7. Materiales, chunks y RAG

## 7.1. `curriculum.materials`

```text
id uuid PK
course_section_id uuid FK
curriculum_version_id uuid NULL FK
title text NOT NULL
material_type text CHECK program|pdf|doc|slide|url|other
object_id uuid NULL
status text CHECK uploaded|processing|ready|failed|removed
content_hash text NOT NULL
mime_type text NULL
uploaded_by_user_id uuid
created_at
updated_at
```

## 7.2. `curriculum.material_chunks`

```text
id uuid PK
material_id uuid FK
course_section_id uuid FK
chunk_index integer NOT NULL
content text NOT NULL
page_no integer NULL
heading_path text[] NULL
embedding vector NULL
embedding_model text NULL
content_hash text NOT NULL
metadata jsonb
created_at
UNIQUE(material_id, chunk_index)
```

Todo retrieval debe incluir `course_section_id` como filtro obligatorio.

Índice vectorial se agrega después de observar volumen; en piloto puede comenzar con HNSW/IVFFlat según pgvector y tamaño real.

---

# 8. Perfil global y onboarding

## 8.1. `profile.student_profiles`

Una fila actual por estudiante.

```text
student_user_id uuid PK FK -> iam.users
current_profile_version integer NOT NULL DEFAULT 0
onboarding_status text CHECK not_started|in_progress|completed
personalization_enabled boolean NOT NULL DEFAULT true
created_at
updated_at
```

## 8.2. `profile.profile_versions`

```text
id uuid PK
student_user_id uuid FK
version_no integer NOT NULL
source_type text CHECK onboarding|experience_update|manual_update|recompute
profile_payload jsonb NOT NULL
confidence_payload jsonb NOT NULL DEFAULT '{}'
created_at
UNIQUE(student_user_id, version_no)
```

El payload mantiene separados interés, experiencia, autopercepción, aspiración, antipreferencia y señales observadas.

## 8.3. `profile.onboarding_responses`

```text
id uuid PK
student_user_id uuid FK
onboarding_version text NOT NULL
stage_key text NOT NULL
question_key text NOT NULL
response_payload jsonb NOT NULL
answered_at timestamptz NOT NULL
UNIQUE(student_user_id, onboarding_version, question_key)
```

La UI puede actualizar respuestas mientras el onboarding está en progreso.

## 8.4. `profile.projects`

```text
id uuid PK
student_user_id uuid FK
name text NOT NULL
description text NULL
problem_statement text NULL
objective text NULL
stage text NULL
industry text NULL
target_users text NULL
personalization_enabled boolean NOT NULL DEFAULT false
visibility text CHECK private|selected_share
created_at
updated_at
archived_at timestamptz NULL
```

## 8.5. `profile.project_assets`

```text
id uuid PK
project_id uuid FK
object_id uuid FK logical
asset_type text NOT NULL
title text NULL
created_at
```

---

# 9. Learning sources

## 9.1. `learning.source_artifacts`

Fuente completa de la que pueden derivarse interacciones/evidencia.

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
source_type text CHECK educai_ai_chat|external_ai_transcript|interactive_experience|structured_activity|exit_ticket|project_artifact|student_explanation
external_provider text NULL
object_id uuid NULL
content_hash text NOT NULL
provenance_quality text CHECK direct|user_uploaded|self_reported
processing_status text CHECK pending|processing|ready|failed|invalidated|deleted
privacy_status text NOT NULL DEFAULT 'active'
parser_version text NULL
source_created_at timestamptz NULL
imported_at timestamptz NULL
created_at
updated_at
```

Índices:

```text
(student_user_id, course_section_id, created_at DESC)
(course_section_id, content_hash)
(content_hash)
```

Dedupe no debe impedir fuentes idénticas en cátedras diferentes si su semántica/ownership difiere; el engine determina duplicación académica.

## 9.2. `learning.ai_conversations`

```text
id uuid PK
source_artifact_id uuid UNIQUE FK
student_user_id uuid FK
course_section_id uuid FK
conversation_mode text CHECK learning|evidence|mixed
status text CHECK active|closed|deleted
started_at
closed_at
created_at
updated_at
```

## 9.3. `learning.ai_messages`

```text
id uuid PK
conversation_id uuid FK
sequence_no integer NOT NULL
actor text CHECK student|assistant|system
content text NOT NULL
model_provider text NULL
model_name text NULL
prompt_version text NULL
assistance_metadata jsonb NOT NULL DEFAULT '{}'
created_at
UNIQUE(conversation_id, sequence_no)
```

## 9.4. `learning.raw_interactions`

```text
id uuid PK
source_artifact_id uuid FK
student_user_id uuid FK
course_section_id uuid FK
actor text CHECK student|assistant|system
interaction_type text NOT NULL
content_text text NULL
payload jsonb NOT NULL DEFAULT '{}'
sequence_no integer NULL
occurred_at timestamptz NOT NULL
created_at
```

---

# 10. Evidence Engine

## 10.1. `evidence.opportunities`

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
source_artifact_id uuid FK
opportunity_family_key text NULL
target_capability_id uuid NULL FK
cognitive_demand text CHECK recognize|explain|apply|solve|transfer
attempt_no integer NOT NULL DEFAULT 1
prior_feedback_received boolean NOT NULL DEFAULT false
independence_group_key text NOT NULL
started_at timestamptz NULL
completed_at timestamptz NULL
created_at
```

`independence_group_key` permite que varias subrespuestas no se contabilicen artificialmente como oportunidades independientes.

## 10.2. `evidence.evidence_events`

Observación normalizada e inmutable.

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
source_artifact_id uuid FK
opportunity_id uuid NULL FK
event_type text NOT NULL
task_context jsonb NOT NULL DEFAULT '{}'
student_action jsonb NOT NULL
cognitive_demand text NOT NULL
assistance_level text CHECK none|light_prompting|scaffolded|substantial|answer_revealed|unknown
provenance_quality text CHECK direct|user_uploaded|self_reported
processor_version text NOT NULL
validity_status text CHECK valid|invalid|superseded
occurred_at timestamptz NOT NULL
created_at
```

No update de contenido. Correcciones generan invalidación o nueva versión derivada.

## 10.3. `evidence.evidence_event_capabilities`

```text
evidence_event_id uuid FK
capability_id uuid FK
PRIMARY KEY(evidence_event_id, capability_id)
```

## 10.4. `evidence.evidence_signals`

```text
id uuid PK
evidence_event_id uuid FK
student_user_id uuid FK
course_section_id uuid FK
capability_id uuid FK
performance text CHECK correct|partially_correct|incorrect|indeterminate
polarity text CHECK supports|challenges|neutral
demonstrated_level text CHECK recognize|explain|apply|solve|transfer
error_type text NULL
mapping_confidence numeric(4,3) CHECK >=0 AND <=1
evidence_quality_band text CHECK HIGH|MEDIUM|LOW|INELIGIBLE
state_eligible boolean NOT NULL
rationale text NOT NULL
source_span_refs jsonb NOT NULL DEFAULT '[]'
processor_version text NOT NULL
created_at
```

Índices críticos:

```text
(student_user_id, course_section_id, capability_id, created_at DESC)
(capability_id, course_section_id, state_eligible)
(evidence_event_id)
```

## 10.5. `evidence.evidence_invalidations`

```text
id uuid PK
source_artifact_id uuid NULL
evidence_event_id uuid NULL
evidence_signal_id uuid NULL
reason_code text NOT NULL
reason text NULL
invalidated_by text CHECK user|system|operator|curriculum_change
created_at
```

Al menos uno de los tres IDs debe existir.

---

# 11. Interpretation Engine

## 11.1. `interpretation.capability_interpretations`

Snapshot vigente por estudiante/cátedra/capacidad.

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
capability_id uuid FK
visible_state text CHECK unknown|in_development|solid|needs_review
maturity_state text CHECK unknown|developing|solid
attention_state text CHECK none|review
evidence_sufficiency text CHECK insufficient|partial|sufficient
interpretation_confidence text CHECK low|medium|high
highest_reliably_demonstrated_level text NULL
historical_peak_state text NULL
next_evidence_need jsonb NOT NULL
prerequisite_risk jsonb NOT NULL DEFAULT '{}'
rationale jsonb NOT NULL
engine_version text NOT NULL
computed_at timestamptz NOT NULL
updated_at
UNIQUE(student_user_id, course_section_id, capability_id)
```

## 11.2. `interpretation.interpretation_history`

```text
id uuid PK
interpretation_id uuid FK
student_user_id uuid
course_section_id uuid
capability_id uuid
snapshot jsonb NOT NULL
engine_version text NOT NULL
computed_at timestamptz NOT NULL
trigger_reason text NOT NULL
created_at
```

## 11.3. `interpretation.error_patterns`

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
capability_id uuid FK
normalized_error_type text NOT NULL
semantic_description text NOT NULL
status text CHECK candidate|confirmed|resolved
first_seen_at timestamptz
last_seen_at timestamptz
resolved_at timestamptz NULL
engine_version text NOT NULL
created_at
updated_at
```

## 11.4. `interpretation.error_pattern_signals`

```text
error_pattern_id uuid FK
evidence_signal_id uuid FK
PRIMARY KEY(error_pattern_id, evidence_signal_id)
```

## 11.5. `interpretation.contradictions`

```text
id uuid PK
student_user_id uuid FK
course_section_id uuid FK
capability_id uuid FK
contradiction_type text CHECK level|context|source|temporal|other
description text NOT NULL
signal_ids uuid[] NOT NULL
status text CHECK active|resolved
created_at
resolved_at NULL
```

---

# 12. Recommendation Engine

## 12.1. `recommendation.recommendations`

```text
id uuid PK
target_actor text CHECK student|teacher
target_scope_id uuid NOT NULL
course_section_id uuid NULL
domain text NOT NULL
mode text NOT NULL
priority_band text CHECK low|normal|high|urgent
objective text NOT NULL
action_spec jsonb NOT NULL
explanation jsonb NOT NULL
status text CHECK generated|surfaced|started|completed|dismissed|disagreed|expired|superseded|invalidated
valid_from timestamptz NOT NULL
valid_until timestamptz NULL
engine_version text NOT NULL
created_at
updated_at
```

## 12.2. `recommendation.recommendation_capabilities`

```text
recommendation_id uuid FK
capability_id uuid FK
PRIMARY KEY(recommendation_id, capability_id)
```

## 12.3. `recommendation.recommendation_sources`

Lineage explícito.

```text
id uuid PK
recommendation_id uuid FK
source_type text CHECK interpretation|teacher_action|milestone|session|feedback|curriculum
source_id uuid NOT NULL
reason_code text NOT NULL
created_at
```

## 12.4. `recommendation.recommendation_feedback`

```text
id uuid PK
recommendation_id uuid FK
student_user_id uuid NULL
feedback_type text CHECK makes_sense|disagree|dismiss|helpful|not_helpful
reason_code text NULL
comment text NULL
created_at
```

## 12.5. `recommendation.recommendation_history`

Append-only de transiciones de lifecycle.

```text
id uuid PK
recommendation_id uuid FK
from_status text NULL
to_status text NOT NULL
reason text NULL
created_at
```

---

# 13. Experience Engine y Runtime

## 13.1. `experience.experience_specs`

```text
id uuid PK
recommendation_id uuid NULL FK
course_section_id uuid FK
objective text NOT NULL
target_capability_ids uuid[] NOT NULL
target_cognitive_level text NOT NULL
delivery_mode text NOT NULL
participation_scope text NOT NULL
pedagogical_pattern text NOT NULL
sequence jsonb NOT NULL
opportunity_manifest jsonb NOT NULL
feedback_policy jsonb NOT NULL
assistance_policy jsonb NOT NULL
evidence_contract jsonb NOT NULL
personalization_envelope jsonb NOT NULL DEFAULT '{}'
equivalence_envelope jsonb NOT NULL DEFAULT '{}'
constraints jsonb NOT NULL DEFAULT '{}'
planner_version text NOT NULL
created_by_user_id uuid NULL
created_at
```

## 13.2. `experience.experience_definitions`

```text
id uuid PK
experience_spec_id uuid FK
experience_key uuid NOT NULL
version text NOT NULL
runtime_adapter text NOT NULL
artifact_bundle_id uuid NULL
instrumentation_contract jsonb NOT NULL
completion_rule jsonb NOT NULL
quality_review jsonb NOT NULL
build_hash text NULL
status text CHECK draft|generating|validating|preview_ready|ready|published|retired|generation_failed|validation_failed|invalidated
published_at timestamptz NULL
created_at
UNIQUE(experience_key, version)
```

Una versión `published` es inmutable.

## 13.3. `experience.artifact_bundles`

```text
id uuid PK
experience_definition_id uuid FK
object_id uuid NOT NULL
content_hash text NOT NULL
manifest jsonb NOT NULL
build_metadata jsonb NOT NULL
created_at
```

## 13.4. `experience.launches`

```text
id uuid PK
experience_definition_id uuid FK
course_section_id uuid FK
class_session_id uuid NULL
launched_by_user_id uuid
status text CHECK scheduled|open|closed|cancelled
join_code text UNIQUE NULL
opens_at timestamptz NULL
closes_at timestamptz NULL
settings jsonb NOT NULL DEFAULT '{}'
created_at
updated_at
```

## 13.5. `experience.sessions`

```text
id uuid PK
launch_id uuid NULL FK
experience_definition_id uuid FK
student_user_id uuid FK
course_section_id uuid FK
status text CHECK created|ready|active|paused|completed|abandoned|expired|failed|invalidated
current_step_id text NULL
state jsonb NOT NULL DEFAULT '{}'
assistance_state jsonb NOT NULL DEFAULT '{}'
attempt_state jsonb NOT NULL DEFAULT '{}'
started_at timestamptz NULL
last_activity_at timestamptz NULL
completed_at timestamptz NULL
created_at
updated_at
```

Índice:

```text
(student_user_id, status, last_activity_at DESC)
(launch_id, status)
```

## 13.6. `experience.runtime_events`

Append-only.

```text
id uuid PK
session_id uuid FK
experience_definition_id uuid FK
student_user_id uuid FK
course_section_id uuid FK
event_type text NOT NULL
step_id text NULL
opportunity_id text NULL
sequence_no bigint NOT NULL
payload jsonb NOT NULL
schema_version text NOT NULL
occurred_at timestamptz NOT NULL
received_at timestamptz NOT NULL DEFAULT now()
idempotency_key text NOT NULL
UNIQUE(session_id, idempotency_key)
UNIQUE(session_id, sequence_no)
```

## 13.7. `experience.runtime_event_batches`

```text
id uuid PK
session_id uuid FK
batch_key text NOT NULL
first_sequence bigint
last_sequence bigint
status text CHECK accepted|partial|rejected
received_at timestamptz
UNIQUE(session_id, batch_key)
```

---

# 14. Feedback de clase

## 14.1. `feedback.class_feedback`

Las respuestas se almacenan con identidad interna solo durante el procesamiento si es necesario para evitar duplicados, pero la capa docente jamás recibe esa identidad.

```text
id uuid PK
class_session_id uuid FK
course_section_id uuid FK
student_user_id uuid FK
least_clear_text text NULL
helped_most text NULL
improvement_text text NULL
submitted_at timestamptz NOT NULL
```

## 14.2. `feedback.class_feedback_summaries`

```text
id uuid PK
class_session_id uuid FK
course_section_id uuid FK
summary_payload jsonb NOT NULL
source_count integer NOT NULL
small_cell_suppressed boolean NOT NULL DEFAULT false
processor_version text NOT NULL
created_at
```

---

# 15. Teacher aggregate projections

Docentes no consultan tablas individuales de interpretación.

## 15.1. `reporting.classroom_capability_projection`

```text
course_section_id uuid
capability_id uuid
enrolled_count integer
evidence_sufficient_count integer
unknown_count integer
developing_count integer
solid_count integer
needs_review_count integer
confirmed_error_patterns jsonb
trend text
projection_version text
computed_at timestamptz
PRIMARY KEY(course_section_id, capability_id)
```

El API aplica small-cell suppression antes de devolver datos.

## 15.2. `reporting.teacher_findings`

```text
id uuid PK
course_section_id uuid
finding_type text
capability_id uuid NULL
summary text NOT NULL
rationale jsonb NOT NULL
priority integer NOT NULL
status text CHECK active|resolved|superseded
projection_version text
created_at
updated_at
```

## 15.3. `reporting.teacher_finding_validations`

```text
id uuid PK
finding_id uuid FK
teacher_user_id uuid FK
validation text CHECK agree|partially_agree|disagree|not_sure
comment text NULL
created_at
```

Nunca modifica directamente estados individuales.

---

# 16. Product analytics

`reporting.product_analytics_events` debe estar separado conceptualmente de `experience.runtime_events`.

```text
id uuid PK
user_id uuid NULL
event_name text NOT NULL
course_section_id uuid NULL
properties jsonb NOT NULL DEFAULT '{}'
occurred_at timestamptz NOT NULL
schema_version text NOT NULL
```

> Un click es analytics. Una acción declarada como oportunidad académica puede ser evidence source. No se promueve analytics a evidencia automáticamente.

---

# 17. Outbox y jobs

## 17.1. `audit.outbox_events`

```text
id uuid PK
aggregate_type text NOT NULL
aggregate_id uuid NOT NULL
event_type text NOT NULL
payload jsonb NOT NULL
schema_version text NOT NULL
correlation_id uuid NOT NULL
created_at timestamptz NOT NULL
published_at timestamptz NULL
attempts integer NOT NULL DEFAULT 0
last_error text NULL
```

Índice parcial:

```text
(created_at) WHERE published_at IS NULL
```

## 17.2. `audit.audit_log`

```text
id uuid PK
actor_user_id uuid NULL
actor_type text CHECK user|operator|service
institution_id uuid NULL
course_section_id uuid NULL
action text NOT NULL
resource_type text NOT NULL
resource_id uuid NULL
reason_code text NULL
metadata jsonb NOT NULL DEFAULT '{}'
created_at timestamptz NOT NULL
```

Append-only.

---

# 18. Object Storage metadata

No se requiere duplicar todo el bucket en SQL, pero sí mantener referencias confiables.

`learning.source_artifacts.object_id`, `curriculum.materials.object_id`, `profile.project_assets.object_id`, etc. deben apuntar a un registry común:

## `audit.objects`

```text
id uuid PK
storage_key text UNIQUE NOT NULL
owner_scope text NOT NULL
owner_id uuid NOT NULL
content_hash text NOT NULL
mime_type text NOT NULL
size_bytes bigint NOT NULL
retention_class text NOT NULL
security_scan_status text CHECK pending|clean|rejected|error
created_at
removed_at timestamptz NULL
```

---

# 19. RLS y autorización

RLS es segunda barrera, no reemplaza authorization de aplicación.

Contexto DB por request/job:

```text
app.user_id
app.institution_id
app.course_section_ids
app.actor_role
app.service_identity
```

Políticas mínimas:

### Estudiante

Puede leer/modificar:

- su perfil;
- sus proyectos;
- sus conversaciones;
- sus estados académicos;
- sus recomendaciones;
- sus sesiones.

No puede leer recursos individuales de otros estudiantes.

### Docente

Puede:

- administrar currícula/cátedra asignada;
- leer projections agregadas;
- leer findings, feedback agregado, launches y materiales.

No puede seleccionar directamente:

- `evidence.evidence_signals` individuales;
- `interpretation.capability_interpretations` individuales;
- `profile.profile_versions` individuales;
- conversaciones individuales.

### Worker

Service identities específicas por dominio. Un worker de Recommendation no necesita permiso de escritura sobre mensajes de chat.

### Operator

Acceso privilegiado solo mediante role separado, reason code y audit log.

---

# 20. PII boundary

Separar mental y preferentemente físicamente:

```text
iam.users: identidad real
academic.enrollments: relación estudiante-cátedra
learning/evidence/interpretation: student_user_id interno
teacher projections: sin student_user_id
```

Los endpoints docentes nunca serializan IDs individuales del dominio académico.

---

# 21. Small-cell suppression

Parámetro inicial:

```text
MIN_AGGREGATE_CELL_SIZE = 5
```

Si un desglose produce `n < 5`:

- no devolver distribución detallada;
- agrupar como “datos insuficientes para mostrar de forma segura”;
- no incluir snippets que permitan reidentificar.

Es un parámetro configurable y debe revisarse antes de producción institucional.

---

# 22. Índices críticos

Mínimos:

```text
academic.enrollments(student_user_id, status)
academic.enrollments(course_section_id, status)
curriculum.curriculum_nodes(curriculum_version_id, parent_id, sort_order)
curriculum.capabilities(course_section_id, status)
curriculum.material_chunks(course_section_id, material_id)
learning.source_artifacts(student_user_id, course_section_id, created_at desc)
learning.source_artifacts(content_hash)
evidence.evidence_signals(student_user_id, course_section_id, capability_id, created_at desc)
interpretation.capability_interpretations(student_user_id, course_section_id, capability_id) UNIQUE
recommendation.recommendations(target_actor, target_scope_id, status, priority_band)
experience.sessions(student_user_id, status, last_activity_at desc)
experience.runtime_events(session_id, sequence_no) UNIQUE
audit.outbox_events(created_at) WHERE published_at IS NULL
```

Agregar índices por query plan real; no indexar indiscriminadamente JSONB.

---

# 23. Idempotencia

Recursos expuestos a retries deben soportarla.

Campos/keys:

- runtime event: `session_id + idempotency_key`;
- upload: `content_hash + owner scope + client_request_id`;
- recommendation lifecycle mutations: `client_request_id`;
- close class: `class_session_id + operation_key`;
- worker jobs: `job_key` derivado de versión + aggregate ID.

---

# 24. Lineage derivado

La base debe poder recorrer:

```text
source_artifact
→ raw_interaction
→ evidence_event
→ evidence_signal
→ capability_interpretation/history
→ recommendation
→ experience_spec/definition
→ experience_session/runtime_event
→ nueva evidence
```

No confiar en búsqueda semántica para invalidación.

`recommendation_sources`, `error_pattern_signals`, `evidence_event_capabilities` y relaciones equivalentes son parte del contrato de lineage.

---

# 25. Delete / invalidate semantics

## 25.1. Fuente eliminada por estudiante

1. marcar `source_artifact.processing_status = deleted`;
2. retirar objeto del storage según política;
3. insertar invalidaciones;
4. encolar recompute de evidence dependiente si aplica;
5. recomputar interpretaciones;
6. invalidar/regenerar recomendaciones;
7. reconstruir projections docentes.

## 25.2. Experiencia inválida

No borrar sesiones históricas.

- definición pasa a `invalidated`;
- nuevas sesiones prohibidas;
- señales afectadas se invalidan si el contrato académico era incorrecto;
- historial permanece para auditoría.

---

# 26. Retention classes

La especificación legal final se define en Privacy & Security. El DB schema debe soportar desde v1:

```text
retention_class
expires_at
removed_at
legal_hold boolean
```

No hardcodear períodos legales dentro del código de dominio.

---

# 27. Migraciones

Cada migración:

- versionada en repositorio;
- reproducible desde DB vacía;
- aplicada primero a staging;
- compatible con deploy rolling cuando sea razonable;
- acompañada de backfill async si modifica volúmenes grandes;
- no elimina columnas críticas en el mismo release que deja de escribirlas.

Patrón expand/contract:

```text
1. agregar nuevo campo/tabla
2. escribir ambos formatos
3. backfill
4. leer nuevo formato
5. dejar de escribir antiguo
6. remover antiguo en release posterior
```

---

# 28. Seed y fixtures

Debe existir seed sintético reproducible con:

```text
institution_alpha
teacher_ana
student_001..020
subject_innovation
course_section_scrum
curriculum v1
capabilities Scrum
source artifacts
signals supporting/challenging
interpretations mixed
recommendations
experience launch
```

Nunca usar dump de producción como dataset de desarrollo.

---

# 29. Invariantes de base que deben tener tests

1. Una cátedra tiene como máximo una currícula activa.
2. Un enrollment único por estudiante/cátedra.
3. Una interpretación actual única por estudiante/cátedra/capacidad.
4. Runtime events no se duplican por `idempotency_key`.
5. Publicar una experience version la vuelve inmutable desde aplicación.
6. Un docente no puede obtener filas individuales protegidas.
7. Una capability no puede prerequisitarse a sí misma.
8. Las referencias cross-course son rechazadas.
9. Un source borrado no sigue apareciendo como activo.
10. Una recomendación superseded no puede volver a ser “next action” sin nueva instancia.

---

# 30. Qué queda fuera de este schema v1

- billing;
- marketplace;
- credenciales públicas;
- notas oficiales;
- asistencia;
- mensajería interna;
- data warehouse separado;
- ML feature store;
- causal inference store;
- multi-region active/active.

---

# 31. Criterios de aceptación

El esquema v1 está listo cuando:

1. todas las entidades del loop académico tienen persistencia explícita;
2. el mismo estudiante puede tener perfil global y estados aislados en múltiples cátedras;
3. una fuente puede eliminarse y todos sus derivados encontrarse por lineage;
4. se puede reconstruir por qué una recomendación fue generada;
5. el docente puede consultar un mapa agregado sin permisos a filas individuales;
6. existe idempotencia para eventos y mutaciones retryable;
7. las experiencias publicadas tienen versionado inmutable;
8. RLS + application authorization tienen tests negativos;
9. la DB soporta reprocessing versionado;
10. migrations y seed pueden levantar un entorno completo desde cero.

---

# 32. Entregables de implementación

Este documento debe convertirse en:

```text
packages/db/schema/*.ts          Drizzle schema
packages/db/migrations/*.sql     migrations
packages/contracts/db/*.ts       enums/shared types
packages/testing/fixtures/*      synthetic fixtures
tests/db/*                       constraints + RLS tests
```

> **El schema no es solo almacenamiento: materializa las fronteras de privacidad, trazabilidad y re-procesabilidad de Educai.**
