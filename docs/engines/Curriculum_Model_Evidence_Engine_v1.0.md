# Educai — Modelo Curricular + Evidence Engine

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo:** Product + System Specification  
**Estado:** Especificación funcional para implementación  
**Dependencias:** PRD Maestro v1.0

---

# 0. Resumen ejecutivo

Esta especificación define dos capas fundamentales de Educai:

1. **Modelo Curricular**: representa qué debe aprenderse y qué capacidades observables pueden demostrarse.
2. **Evidence Engine**: registra qué hizo realmente el estudiante y qué señales aporta esa acción sobre esas capacidades.

La separación central es:

```text
MODELO CURRICULAR
qué debería aprenderse y observarse
        ↓
CAPABILITY
unidad académica observable
        ↓
EXPERIENCIA / CONVERSACIÓN / EJERCICIO
        ↓
EVIDENCE ENGINE
qué hizo realmente el estudiante
        ↓
EVIDENCE EVENT
        ↓
EVIDENCE SIGNAL
qué indica respecto de una capacidad
        ↓
INTERPRETATION ENGINE
qué podemos sostener actualmente
```

El Evidence Engine **no** decide si una capacidad está en “Evidencia sólida”, “En desarrollo” o “Conviene revisar”. Esa decisión pertenece al Interpretation Engine.

---

# 1. Principios

## 1.1. Capacidad como unidad central

Educai no intenta responder:

> “¿Sabe Scrum?”

Debe trabajar con capacidades concretas y observables, por ejemplo:

> “Puede diferenciar responsabilidades del Product Owner y Scrum Master frente a una situación concreta.”

## 1.2. Evidencia antes que inferencia

Separar siempre:

```text
EVIDENCIA
qué ocurrió

↓

SEÑAL
qué podría indicar sobre una capacidad

↓

INTERPRETACIÓN
qué creemos actualmente al combinar múltiples señales
```

## 1.3. Declarado ≠ observado ≠ inferido ≠ evaluado

- “Creo que entiendo” no equivale a comprensión demostrada.
- “Me gusta estrategia” no equivale a capacidad estratégica.
- La respuesta de una IA no es evidencia de aprendizaje del alumno.
- Tiempo de uso no es evidencia académica.

## 1.4. Trazabilidad

Toda interpretación futura debe poder rastrearse hasta la fuente original:

```text
SourceArtifact
→ RawInteraction
→ EvidenceEvent
→ EvidenceSignal
→ Capability
→ CapabilityInterpretation
→ Recommendation
```

---

# PARTE I — MODELO CURRICULAR

# 2. Jerarquía académica

Jerarquía base:

```text
Materia
↓
Módulo
↓
Unidad / Lectura
↓
Tema
↓
Subtema
```

No todas las materias necesitan todos los niveles.

Esta jerarquía conserva la estructura oficial del curso; no representa por sí sola progreso del estudiante.

---

# 3. Objetos curriculares

## 3.1. CurriculumNode

Representa estructura.

Campos conceptuales:

```text
id
course_section_id
curriculum_version_id
parent_id
node_type
title
description
order
source_refs
provenance
status
```

`node_type`:

```text
module
unit
reading
topic
subtopic
```

`provenance`:

```text
official_explicit
derived_from_material
teacher_added
```

## 3.2. Concept

Representa conocimiento, términos o ideas relevantes.

Ejemplos:

- Product Owner
- Sprint
- Product Backlog
- PMO

Campos:

```text
id
course_section_id
name
description
curriculum_node_ids
source_refs
```

Los conceptos sirven para retrieval, RAG, mapeo y generación de experiencias. No son la unidad principal de progreso.

## 3.3. LearningOutcome

Representa resultados o competencias explícitos del programa.

Campos:

```text
id
course_section_id
statement
source_refs
provenance
```

Sirve para verificar alineación entre programa y capacidades.

## 3.4. Capability

Es la unidad académica central.

Campos:

```text
id
course_section_id
curriculum_version_id
statement
action_verb
object
curriculum_node_ids
concept_ids
learning_outcome_ids
target_cognitive_level
prerequisite_capability_ids
importance
source_refs
provenance
status
```

---

# 4. Reglas de una Capability

Una capacidad debe ser:

### Observable

No:

> Comprender Scrum.

Sí:

> Explicar cómo se organiza un Sprint.

### Atómica

Evitar mezclar múltiples comportamientos distintos en una sola capacidad.

### Específica

No:

> Aplicar gestión de proyectos.

Sí:

> Identificar qué grupo de procesos corresponde ante una situación determinada.

### Evaluable

Debe ser posible diseñar una situación donde el estudiante pueda demostrarla.

---

# 5. Taxonomía cognitiva operativa

Educai usa cinco niveles:

| Nivel | Pregunta | Ejemplo |
|---|---|---|
| Reconocer | ¿Puede identificarlo? | Identificar el Product Owner |
| Explicar | ¿Puede reconstruirlo? | Explicar responsabilidades |
| Aplicar | ¿Puede usarlo en una situación conocida? | Asignar una decisión al rol correcto |
| Resolver | ¿Puede usarlo ante ambigüedad? | Resolver conflicto entre roles |
| Transferir | ¿Puede usarlo en un contexto nuevo? | Aplicar criterio en otra organización |

La UI puede agrupar Reconocer + Explicar bajo “Comprender”.

No generar automáticamente cinco capacidades por tema. La taxonomía orienta, no obliga.

---

# 6. Ejemplo — Roles Scrum

Tema:

> Roles Scrum

Conceptos:

```text
Product Owner
Scrum Master
Equipo
Stakeholders
Priorización
Impedimentos
```

Capacidades posibles:

```text
CAP-SCRUM-01
Explicar responsabilidades principales del Product Owner.
target = explain

CAP-SCRUM-02
Explicar responsabilidades principales del Scrum Master.
target = explain

CAP-SCRUM-03
Diferenciar responsabilidades del Product Owner y Scrum Master.
target = apply

CAP-SCRUM-04
Asignar correctamente responsabilidades frente a situaciones de un Sprint.
target = apply

CAP-SCRUM-05
Resolver situaciones ambiguas donde intervienen ambos roles.
target = resolve

CAP-SCRUM-06
Aplicar el criterio de separación de responsabilidades a un contexto ágil nuevo.
target = transfer
```

---

# 7. Grafo de capacidades

Las capacidades pueden relacionarse mediante:

```text
prerequisite_of
supports
part_of
```

Los prerrequisitos permiten detectar riesgo académico, pero no deben convertirse automáticamente en bloqueos absolutos.

---

# 8. Versionado curricular

Cada cátedra tiene `CurriculumVersion`.

Una versión activada es referencia para evidencia e interpretaciones.

Cuando el docente cambia sustancialmente una capacidad:

- no sobrescribir silenciosamente;
- crear nueva versión;
- preservar lineage;
- marcar capacidades reemplazadas/superseded;
- decidir si evidencia histórica puede remapearse.

---

# 9. Flujo de generación curricular

```text
Programa + materiales
↓
extraer estructura oficial
↓
extraer outcomes y conceptos
↓
proponer capabilities
↓
proponer prerequisitos
↓
deduplicar
↓
docente revisa
↓
docente confirma / edita
↓
currícula activa
```

La UI debe presentar una revisión comprensible:

> **Así entendimos tu materia**

No exigir revisión objeto por objeto cuando pueda validarse por bloques.

---

# PARTE II — EVIDENCE ENGINE

# 10. Objetivo

El Evidence Engine responde:

> **¿Qué ocurrió y qué señal académica aporta esa acción?**

No responde:

> “¿El estudiante domina esta capacidad?”

---

# 11. Pipeline

```text
SourceArtifact
↓
RawInteraction
↓
Evidence Candidate
↓
validación / dedupe / contexto
↓
EvidenceEvent
↓
Capability Mapping
↓
EvidenceSignal
```

---

# 12. SourceArtifact

Representa una fuente completa.

Campos:

```text
id
student_id
course_section_id
source_type
external_provider
content_hash
created_at
imported_at
parser_version
processing_status
raw_source_pointer
privacy_status
deletion_status
```

`source_type` inicial:

```text
educai_ai_chat
external_ai_transcript
interactive_experience
structured_activity
exit_ticket
project_artifact
student_explanation
```

---

# 13. RawInteraction

Acción específica dentro de una fuente.

Ejemplos:

- mensaje del estudiante;
- decisión;
- respuesta;
- explicación;
- modificación de variable;
- artefacto entregado.

Campos:

```text
id
source_artifact_id
actor
interaction_type
content
timestamp
sequence
context
```

`actor`:

```text
student
educai_ai
system
```

Solo una acción atribuible al estudiante puede generar evidencia académica directa.

---

# 14. EvidenceEvent

Observación normalizada e inmutable.

Campos:

```text
id
student_id
course_section_id
source_artifact_id
raw_interaction_ids
timestamp
event_type
task_context
student_action
target_capability_ids
cognitive_demand
assistance_level
provenance_quality
opportunity_id
deduplication_key
processing_version
validity_status
```

`event_type` inicial:

```text
answer
explanation
decision
classification
calculation
artifact
revision
application
reflection
```

Una reflexión solo es evidencia académica si demuestra contenido o razonamiento.

---

# 15. EvidenceSignal

Un EvidenceEvent puede producir señales hacia una o varias capabilities.

Campos:

```text
id
evidence_event_id
capability_id
performance
polarity
demonstrated_level
error_type
mapping_confidence
evidence_quality_band
state_eligible
rationale
source_span_refs
```

`performance`:

```text
correct
partially_correct
incorrect
indeterminate
```

`polarity`:

```text
supports
challenges
neutral
```

“Contradicción” no es propiedad de una señal individual. La detecta el Interpretation Engine al comparar señales.

---

# 16. Error taxonomy inicial

```text
misconception
procedural_error
incomplete_reasoning
application_failure
transfer_failure
calculation_error
attention_error
unknown
```

El tipo de error puede ser inferido semánticamente, pero debe guardar confianza y rationale.

---

# 17. Nivel demostrado

El nivel máximo demostrable está limitado por la demanda de la tarea.

Una definición correcta puede demostrar `explain`, no `transfer`.

Para transferir, la experiencia debe exigir un contexto suficientemente nuevo.

---

# 18. Assistance level

Valores:

```text
none
light_prompting
scaffolded
substantial
answer_revealed
unknown
```

Regla crítica:

> Una respuesta correcta después de que la solución fue revelada no constituye evidencia positiva independiente.

Puede registrarse como práctica o recuperación posterior, pero con `state_eligible = false` para demostrar autonomía por sí sola.

---

# 19. Opportunity

Una `Opportunity` es una ocasión razonablemente independiente de demostrar una capacidad.

No contar cada click ni cada subpregunta como evidencia independiente.

Una experiencia rica puede contener varias opportunities si:

- los escenarios son suficientemente distintos;
- no existe contaminación por feedback entre ellos;
- el EvidenceContract lo declara.

Reintentos deben registrar:

```text
attempt_number
prior_feedback_received
same_opportunity_family
```

---

# 20. Evidence quality

Evitar scores pseudocientíficos visibles.

Bandas internas:

```text
HIGH
MEDIUM
LOW
INELIGIBLE
```

HIGH suele implicar:

- acción observada directamente;
- tarea bien especificada;
- mapping claro;
- poca asistencia.

MEDIUM:

- evidencia útil con interpretación semántica o procedencia menos fuerte.

LOW:

- contexto incompleto, alta asistencia o mapeo incierto.

INELIGIBLE:

- duplicado;
- respuesta revelada;
- self-report;
- parseo fallido;
- acción no atribuible.

---

# 21. Provenance

Clasificación conceptual:

### A — observada directamente

- chat Educai;
- simulación Educai;
- actividad instrumentada.

### B — aportada con trazabilidad

- TXT/MD externo;
- artefacto subido.

### C — autodeclarada/contextual

- “Creo que entiendo”.
- “Soy bueno en estadística”.

C no demuestra capacidad académica por sí sola.

---

# 22. Conversaciones IA

## Integrada

Analizar episodios:

```text
pregunta
↓
respuesta inicial
↓
ayuda
↓
nuevo intento
↓
feedback
```

Preservar qué produjo el estudiante **antes de recibir ayuda**.

## Externa

Flujo:

```text
TXT/MD
↓
hash / dedupe
↓
parsear roles
↓
identificar turnos
↓
detectar ayudas
↓
segmentar episodios
↓
mapear a materia/capabilities
↓
EvidenceEvents / EvidenceSignals
```

Si no pueden distinguirse roles, pedir confirmación. No inventar.

---

# 23. Simulaciones y actividades instrumentadas

Toda oportunidad planificada debería declarar:

```text
capability_measured
scenario
expected_behavior
acceptable_behaviors
common_errors
cognitive_level
```

Esto reduce dependencia de interpretación post-hoc por LLM.

---

# 24. Proyectos y artefactos

Un proyecto no genera evidencia por existir.

Para usar un artefacto como evidencia debe existir:

```text
target capability
task
criteria
expected output
```

Subir un documento extenso no equivale a demostrar una capacidad.

---

# 25. Actividades presenciales

Una actividad presencial no produce automáticamente evidencia individual.

Para actualizar estado individual debe existir captura atribuible:

- exit ticket;
- respuesta digital;
- explicación individual;
- artefacto;
- mini desafío.

Una observación docente agregada puede informar el aula, pero no debe modificar directamente el estado individual.

---

# 26. Self-report

Separar:

```text
“Entendí”
“Me gustó”
“Me pareció difícil”
```

de una demostración real.

Son señales contextuales, no evidencia académica.

---

# 27. Mapping evidencia → capability

Una acción puede aportar señales a varias capabilities.

Cada vínculo genera su propio EvidenceSignal.

El mapper debe ser conservador:

> mencionar un concepto no demuestra una capacidad.

`mapping_confidence` puede ser numérico internamente, pero no se muestra al estudiante.

Thresholds iniciales son parámetros a calibrar, no verdades científicas.

---

# 28. Dedupe

Toda fuente debe registrar `content_hash`.

Re-subir la misma conversación no genera evidencia adicional.

Cuando una exportación cambia de formato, puede existir `duplicate_of` y excluirse del conteo académico.

---

# 29. Eliminación e invalidación

Si el estudiante elimina una fuente:

```text
SourceArtifact invalidado/eliminado
↓
EvidenceEvents invalidados
↓
EvidenceSignals invalidadas
↓
Interpretation recalculada
↓
Recommendations recalculadas
```

Nunca conservar una conclusión cuya única fuente válida fue eliminada.

---

# 30. Perfil profesional separado

Una misma experiencia puede generar dos canales distintos:

### Académico

> tomó una decisión correcta → evidencia sobre una capability.

### Perfil

> “me gustó asumir esta responsabilidad” → preferencia profesional.

Regla:

```text
capacidad ≠ preferencia
habilidad ≠ interés
```

No inferir una desde la otra.

---

# 31. Output del Evidence Engine

Ejemplo:

```json
{
  "student_id": "stu_123",
  "course_section_id": "sec_45",
  "capability_id": "CAP-SCRUM-04",
  "evidence_event_id": "ev_847",
  "performance": "incorrect",
  "polarity": "challenges",
  "demonstrated_level": "apply",
  "error_type": "application_failure",
  "assistance_level": "none",
  "opportunity_id": "opp_93",
  "evidence_quality_band": "HIGH",
  "mapping_confidence": 0.96,
  "state_eligible": true,
  "rationale": "El estudiante asignó al Scrum Master una decisión de priorización que corresponde al Product Owner."
}
```

El motor termina aquí. El Interpretation Engine decide el estado académico.

---

# 32. Guardrails

El Evidence Engine no debe:

- decidir próxima acción;
- decidir “dominio”;
- producir porcentajes de comprensión;
- usar tiempo invertido como aprendizaje;
- usar output de IA como evidencia del alumno;
- confundir preferencia con capacidad;
- contar clicks como opportunities;
- esconder contradicciones;
- ignorar asistencia;
- confiar ciegamente en fuentes externas.

---

# 33. Contrato entre módulos

```text
CURRICULUM MODEL
“estas son las capacidades”
        ↓
EVIDENCE ENGINE
“esto hizo el estudiante y estas señales aporta”
        ↓
INTERPRETATION ENGINE
“esto es lo que podemos sostener actualmente”
        ↓
RECOMMENDATION ENGINE
“esto es lo mejor que conviene hacer ahora”
        ↓
EXPERIENCE ENGINE
“esta experiencia genera aprendizaje + nueva evidencia”
```

La pareja fundamental del modelo académico de Educai es:

> **Capability + EvidenceSignal trazable a una acción real del estudiante.**
