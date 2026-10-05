# Educai — Recommendation Engine

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo de documento:** Product + System Specification  
**Estado:** Especificación funcional para implementación  
**Dependencias:** PRD Maestro v1.0 + Modelo Curricular v1 + Evidence Engine v1 + Interpretation Engine v1  

---

# 0. Resumen ejecutivo

El **Recommendation Engine** es la capa de Educai que transforma una interpretación académica actual en una **próxima decisión concreta**.

Su responsabilidad no es determinar qué sabe el estudiante —eso pertenece al **Interpretation Engine**— ni generar directamente una simulación, una presentación o una actividad completa —eso pertenece al **Experience Engine / Asistente Educai**.

Su responsabilidad es responder:

> **Dado lo que sabemos hoy, el momento de la cursada, las restricciones reales y las prioridades pedagógicas, ¿cuál es la acción de mayor valor que conviene realizar ahora?**

El motor tiene dos superficies principales:

**Estudiante**

> **¿Qué es lo más útil que puedo hacer ahora?**

**Docente**

> **¿Qué necesita mi aula y cuál es la mejor intervención siguiente?**

La arquitectura central es:

```text
CURRICULUM MODEL
qué debería aprenderse
        +
INTERPRETATION ENGINE
qué podemos sostener hoy
        +
CONTEXTO
qué está ocurriendo ahora
        ↓
RECOMMENDATION ENGINE
qué conviene hacer a continuación
        ↓
ACTION SPEC
qué objetivo, estrategia y evidencia debe producirse
        ↓
EXPERIENCE ENGINE / ASISTENTE
cómo se ejecuta concretamente
        ↓
NUEVA EXPERIENCIA
        ↓
EVIDENCE ENGINE
```

El Recommendation Engine debe optimizar para:

> **menos fricción → más aprendizaje útil → más evidencia de calidad → mejores próximas decisiones**

No debe optimizar para engagement por engagement, tiempo de pantalla, cantidad de mensajes ni consumo de contenido.

---

# 1. Objetivo

El Recommendation Engine debe:

1. construir candidatos de acción a partir de interpretaciones, currícula y contexto;
2. resolver obligaciones y urgencias temporales;
3. conservar continuidad cuando tiene sentido continuar donde el usuario quedó;
4. priorizar dificultades confirmadas y prerrequisitos bloqueantes;
5. convertir `next_evidence_need` en una acción educativa concreta;
6. decidir cuándo avanzar, practicar, remediar, verificar o transferir;
7. adaptar el formato sin modificar el objetivo académico obligatorio;
8. utilizar proyectos e intereses para contextualizar cuando sea útil;
9. seleccionar una acción principal y un número limitado de alternativas;
10. producir explicaciones trazables de por qué recomienda algo;
11. respetar privacidad, aislamiento por cátedra y anonimato docente;
12. invalidar recomendaciones cuando cambian las condiciones que las originaron;
13. registrar resultados para poder aprender qué estrategias funcionan mejor;
14. entregar un contrato estructurado al Experience Engine;
15. mantener una política reproducible, versionada y auditable.

---

# 2. Qué NO hace

El Recommendation Engine no debe:

- reinterpretar evidencia cruda;
- cambiar un `CapabilityInterpretation` por su cuenta;
- inventar dificultades que el Interpretation Engine no detectó;
- crear porcentajes de comprensión;
- sustituir la currícula;
- bajar dificultad académica porque al estudiante no le gusta un tema;
- convertir intereses profesionales en obligaciones académicas;
- revelar datos individuales al docente;
- generar directamente código de una simulación;
- decidir libremente deadlines inexistentes;
- usar tiempo de pantalla como objetivo;
- recomendar constantemente evaluaciones solo para aumentar cobertura de evidencia;
- hacer recomendaciones opacas sin poder explicar su origen;
- utilizar una única fórmula numérica como sustituto del criterio pedagógico estructurado;
- afirmar causalidad entre una recomendación y una mejora sin evidencia adecuada.

---

# 3. Principio rector

La recomendación debe conservar esta separación:

```text
INTERPRETATION
qué creemos actualmente

↓

RECOMMENDATION INTENT
qué necesidad conviene resolver

↓

ACTION STRATEGY
qué tipo de acción puede resolverla

↓

ACTION SPEC
qué debe ejecutar el siguiente sistema

↓

EXPERIENCE
cómo se materializa para la persona
```

El Recommendation Engine decide **qué conviene hacer y con qué objetivo**.

El Experience Engine decide **cómo convertirlo en una experiencia concreta de alta calidad**.

---

# 4. Alcance de v1

Recommendation Engine v1 cubre:

- recomendaciones académicas individuales para estudiantes;
- recomendaciones de continuidad para estudiantes;
- recomendaciones de aplicación a proyectos;
- recomendaciones agregadas de intervención para docentes;
- recomendaciones de mejora de práctica docente derivadas de feedback agregado;
- orquestación global del Home del estudiante entre múltiples materias.

No cubre en v1:

- recomendaciones institucionales complejas;
- elección automatizada de carrera;
- decisiones de calificación;
- selección individual de alumnos para intervención visible al docente;
- optimización autónoma mediante reinforcement learning;
- agrupamientos nominales de estudiantes.

---

# 5. Dos niveles del sistema estudiante

El estudiante puede cursar varias cátedras simultáneamente.

Para preservar el aislamiento académico se separan dos niveles:

## 5.1. Section Recommendation Engine

Existe uno por cátedra.

Consume únicamente:

- currícula de esa cátedra;
- interpretaciones de ese estudiante en esa cátedra;
- cronograma de esa cátedra;
- experiencias de esa cátedra;
- contexto global permitido para personalización.

Produce:

> la mejor recomendación disponible dentro de esa cátedra.

## 5.2. Global Student Orchestrator

Recibe **metadata de recomendaciones**, no evidencia académica cruda de distintas cátedras.

Puede comparar:

- prioridad;
- obligatoriedad;
- deadline;
- urgencia;
- recencia;
- duración estimada;
- estado de continuidad.

Selecciona:

> **Tu próximo paso**

para la Home global.

Regla:

> **Las cátedras no comparten evidencia académica entre sí para interpretar aprendizaje. El orquestador solamente compara recomendaciones ya producidas.**

---

# 6. Inputs comunes

Como mínimo, el motor recibe:

## 6.1. Curriculum context

```text
course_section_id
curriculum_version_id
current_curriculum_nodes
active_capability_ids
next_capability_ids
capability_importance
prerequisite_graph
learning_outcomes
```

## 6.2. Capability interpretations

Por capacidad:

```text
visible_state
maturity_state
attention_state
highest_reliably_demonstrated_level
evidence_sufficiency
interpretation_confidence
unresolved_error_patterns
contradictions
next_evidence_need
prerequisite_risk
recent_history
historical_peak_state
```

## 6.3. Temporal context

```text
current_date
class_schedule
assessment_schedule
active_deadlines
current_class_index
planned_topics
actual_topics
```

## 6.4. Recommendation history

```text
recent_recommendations
started_recommendations
completed_recommendations
dismissed_recommendations
disagreed_recommendations
recent_action_types
cooldowns
```

---

# 7. Inputs específicos del estudiante

El motor puede recibir:

```text
active_teacher_actions
incomplete_sessions
recent_learning_sessions
available_time
available_device
accessibility_constraints
student_intent
student_profile_context
projects
personalization_preferences
```

`student_profile_context` y `projects` pueden modificar el **contexto o formato** de una recomendación, pero no su prioridad académica fundamental salvo que el estudiante haya elegido explícitamente trabajar mediante un proyecto.

---

# 8. Inputs específicos del docente

El motor docente opera siempre a nivel agregado de cátedra.

Puede recibir:

```text
classroom_capability_summaries
classroom_findings
classroom_error_patterns
evidence_coverage
curriculum_importance
prerequisite_centrality
assessment_proximity
learning_trends
previous_interventions
class_feedback_patterns
classroom_context
aggregate_profile_context
```

No recibe para recomendación visible al docente:

- nombres asociados a estados;
- perfiles individuales;
- conversaciones individuales identificadas;
- proyectos privados individuales.

---

# 9. `ClassroomCapabilitySummary`

Objeto agregado recomendado:

```json
{
  "course_section_id": "sec_45",
  "capability_id": "CAP-SCRUM-04",
  "enrolled_count": 42,
  "evidence_sufficient_count": 27,
  "evidence_coverage": 0.64,
  "state_counts": {
    "unknown": 0,
    "in_development": 10,
    "solid": 5,
    "needs_review": 12
  },
  "needs_review_rate": 0.44,
  "developing_rate": 0.37,
  "solid_rate": 0.19,
  "confirmed_error_patterns": [],
  "cognitive_gap_summary": [],
  "trend": "stable",
  "last_intervention_id": null
}
```

Los porcentajes de estado se calculan sobre estudiantes con evidencia suficiente cuando corresponda.

---

# 10. Output principal: `Recommendation`

El motor produce un objeto estructurado.

```json
{
  "recommendation_id": "rec_123",
  "target_actor": "student",
  "target_scope_id": "stu_123",
  "course_section_id": "sec_45",

  "domain": "academic_learning",
  "mode": "remediate",
  "priority_band": "high",

  "target_capability_ids": ["CAP-SCRUM-04"],
  "source_interpretation_ids": ["int_921"],
  "reason_codes": ["CONFIRMED_ERROR_PATTERN"],

  "objective": "Diferenciar quién prioriza y quién facilita frente a situaciones ambiguas.",

  "action_spec": {
    "action_type": "error_focused_practice",
    "target_cognitive_level": "apply",
    "estimated_duration_minutes": 10,
    "sequence_pattern": "contrast_then_independent_retest",
    "context_strategy": "relevant_or_neutral",
    "evidence_requirement": "independent_application"
  },

  "explanation": {
    "short": "Apareció una confusión recurrente entre Product Owner y Scrum Master.",
    "why": "La misma dificultad apareció en dos oportunidades independientes.",
    "uncertainty": null
  },

  "valid_from": "...",
  "valid_until": "...",
  "status": "generated",
  "engine_version": "1.0"
}
```

---

# 11. Dominios de recomendación

Valores iniciales:

```text
academic_learning
continuity
assessment_preparation
project_application
teaching_intervention
teaching_practice
workflow
```

La Home del estudiante prioriza `academic_learning`, `continuity`, `assessment_preparation` y acciones activas del docente.

La Home docente prioriza `teaching_intervention`.

`teaching_practice` aparece en un bloque separado como:

> **Qué podés mejorar en tu próxima clase**

---

# 12. Modos de recomendación del estudiante

```text
resume
learn
remediate
practice
verify
advance
transfer
apply_to_project
assessment_review
```

## resume

Continuar una experiencia válida e incompleta.

## learn

Introducir o aclarar contenido cuando todavía no corresponde evaluar autonomía.

## remediate

Resolver una dificultad confirmada.

## practice

Consolidar una capacidad en desarrollo.

## verify

Obtener evidencia independiente cuando ya existe aprendizaje probable pero insuficiente.

## advance

Pasar al siguiente objetivo curricular adecuado.

## transfer

Usar una capacidad sólida en un contexto nuevo.

## apply_to_project

Utilizar un proyecto real como contexto de aplicación.

## assessment_review

Priorizar recuperación, corrección de errores y práctica antes de un hito evaluativo cercano.

---

# 13. Tipos de acción del estudiante

Catálogo inicial:

```text
resume_session
complete_teacher_action
guided_explanation
contrastive_example
retrieval_practice
diagnostic_probe
independent_attempt
error_focused_practice
application_challenge
contradiction_probe
transfer_challenge
project_application
assessment_review
advance_to_next_capability
ai_tutoring_session
```

El catálogo debe ser extensible y versionado.

---

# 14. Modos de recomendación docente

```text
intervene
diagnose
prepare
review
advance
improve_teaching
follow_up
```

El modo no determina todavía la mecánica exacta de la clase.

Ejemplo:

```text
mode = intervene
strategy = contrastive_decision_scenario
```

El Experience Engine puede materializarlo como simulación digital, tarjetas impresas o discusión guiada según restricciones.

---

# 15. Estrategias de intervención docente

Catálogo inicial:

```text
reteach_with_contrast
worked_example
peer_instruction
case_discussion
decision_scenario
interactive_simulation
retrieval_sequence
diagnostic_probe
exit_ticket
differentiated_digital_experience
review_class
transfer_case
class_sequence
advance_curriculum
teaching_practice_adjustment
```

El Recommendation Engine selecciona una **estrategia**.

El Experience Engine selecciona/genera la **implementación**.

---

# 16. Candidate generation

El motor no debe elegir directamente entre todas las acciones posibles.

Primero genera `RecommendationIntent`.

```text
interpretación / obligación / contexto
        ↓
RecommendationIntent
        ↓
ActionStrategy candidates
        ↓
constraints
        ↓
ranking
        ↓
Recommendation
```

Ejemplo de intent:

```json
{
  "intent_type": "resolve_confirmed_error",
  "capability_id": "CAP-SCRUM-04",
  "target_level": "apply",
  "error_pattern_id": "err_22",
  "urgency": "normal",
  "allowed_action_types": [
    "error_focused_practice",
    "contrastive_example",
    "application_challenge"
  ]
}
```

---

# 17. Fuentes de candidatos estudiante

Se generan candidatos desde:

1. acciones activas lanzadas por el docente;
2. sesiones incompletas válidas;
3. assessments próximos;
4. capacidades `needs_review`;
5. `next_evidence_need`;
6. riesgos de prerrequisito;
7. objetivos curriculares activos;
8. siguiente capacidad curricular;
9. capacidades sólidas candidatas a transferencia;
10. proyectos cuando el estudiante habilitó su uso;
11. intención manual del estudiante.

---

# 18. Mapping `next_evidence_need` → Recommendation Intent

El Interpretation Engine entrega **qué evidencia falta**. El Recommendation Engine lo convierte en **qué hacer**.

| `next_evidence_need` | Intent recomendado | Acción típica |
|---|---|---|
| `more_evidence` | obtener otra observación informativa | práctica corta / microdesafío |
| `independent_attempt` | demostrar en otra oportunidad | caso paralelo independiente |
| `unassisted_attempt` | demostrar autonomía | desafío sin pistas |
| `higher_cognitive_level` | elevar demanda cognitiva | aplicar / resolver |
| `new_context` | comprobar robustez contextual | caso con contexto distinto |
| `error_retest` | comprobar corrección de error | remedio + retest |
| `transfer_opportunity` | demostrar transferencia | problema nuevo |
| `contradiction_resolution` | discriminar hipótesis | probe controlado |
| `no_additional_evidence_needed` | avanzar | siguiente capacidad / transferencia |

---

# 19. Principio learning-first

Educai necesita evidencia, pero el estudiante no debe sentir que está siendo evaluado permanentemente.

Regla:

> **La búsqueda de evidencia debe estar subordinada al aprendizaje útil.**

Si una capacidad todavía no fue introducida, `unknown` no significa automáticamente:

> “hacé un diagnóstico”.

Puede significar:

> “primero aprendé esto”.

El motor debe considerar si la capacidad está:

```text
not_introduced
introduced
active
assessment_relevant
completed_in_schedule
```

---

# 20. Política principal de prioridad — estudiante

La política v1 es jerárquica, no un único score opaco.

Orden general:

```text
A. obligación temporal válida
B. continuidad válida, salvo override urgente
C. urgencia académica
D. dificultad confirmada
E. necesidad de evidencia sobre objetivo actual
F. avanzar currícula
G. transferir / profundizar
```

---

# 21. A — Obligación temporal válida

Mayor prioridad cuando existe una acción del docente marcada como:

```text
required
```

y:

- está activa;
- pertenece a esa cátedra;
- no fue completada;
- tiene deadline vigente.

Ejemplo:

> **Tu docente lanzó una simulación de Scrum.**

Si la acción es `recommended` u `optional`, compite normalmente con otras necesidades.

---

# 22. B — Continuar donde quedaste

La continuidad es una decisión estructural de UX.

Una sesión incompleta puede ganar prioridad si:

1. sigue siendo académicamente válida;
2. no fue descartada explícitamente;
3. la recomendación original no fue superseded;
4. pertenece a un objetivo todavía relevante;
5. no existe un override urgente.

Default inicial configurable:

```text
resume_window = 72 horas
```

No mostrar eternamente:

> “Continuar donde quedaste”

si el contexto cambió.

---

# 23. C — Override urgente

Puede interrumpir la continuidad cuando existe:

- evaluación cercana;
- dificultad confirmada en un prerrequisito crítico;
- deadline docente inminente;
- intervención pedagógica explícitamente priorizada.

Ejemplo:

> El alumno dejó un ejercicio de transferencia ayer, pero tiene un parcial mañana y mantiene un error confirmado en una capacidad central.

La preparación del parcial puede ganar prioridad.

Default inicial para `assessment_near`:

```text
<= 7 días
```

Debe ser parametrizable.

---

# 24. D — Dificultad confirmada

Si:

```text
attention_state = review
```

se genera un intent de remediación.

La acción debe ser específica al patrón.

No:

> “Repasá Scrum.”

Sí:

> “Resolvé tres situaciones donde tenés que distinguir quién prioriza y quién elimina impedimentos.”

---

# 25. Secuencia de remediación

Cuando existe una misconception confirmada, una acción puede ser una secuencia corta.

Default:

```text
1. contraste / explicación mínima
2. ejemplo o práctica guiada
3. nuevo intento independiente
```

La Home sigue mostrando una sola acción:

> **Aclará PO vs. Scrum Master — 10 min**

internamente puede contener varios microsteps.

---

# 26. E — Necesidad de evidencia sobre objetivo actual

Cuando no existe `review`, usar `next_evidence_need`.

Ejemplos:

### `unassisted_attempt`

> Resolver un caso sin pistas.

### `higher_cognitive_level`

> Aplicar el concepto a una situación.

### `contradiction_resolution`

> Resolver una tarea diseñada específicamente para distinguir entre dos hipótesis interpretativas.

---

# 27. F — Avanzar currícula

Si:

- no existe una dificultad activa prioritaria;
- la capacidad actual tiene evidencia suficiente;
- los prerrequisitos están razonablemente cubiertos;

el motor puede recomendar:

> la siguiente capacidad curricular.

La selección debe considerar:

- orden de la materia;
- prerequisitos;
- importancia;
- cronograma real;
- contenidos efectivamente trabajados por el docente.

---

# 28. G — Transferir o profundizar

Si una capacidad está `solid` y sigue siendo relevante:

> **transferir antes que repetir innecesariamente.**

Ejemplo:

> Ya aplicaste TAM/SAM/SOM correctamente en casos guiados. Ahora defendé tus supuestos usando un proyecto real.

Transferir no debe desplazar contenidos nuevos obligatorios cuando la currícula requiere avanzar.

---

# 29. Prerrequisitos

El Recommendation Engine consume `prerequisite_risk`.

Si:

```text
A prerequisite_of B
A = needs_review
B = objetivo activo
```

puede recomendar A antes de B.

Pero no debe bloquear automáticamente B en todos los casos.

Reglas:

- si A es crítico para ejecutar B, priorizar A;
- si B ya tiene evidencia sólida propia, no degradarlo;
- si A está `unknown`, no asumir que A está mal;
- si el docente asignó B obligatoriamente, respetar la acción y adaptar soporte.

---

# 30. Assessment preparation

Cuando existe un parcial/hito cercano, el motor puede entrar en modo:

```text
assessment_review
```

Prioriza:

1. capacidades importantes con `needs_review`;
2. capacidades `developing` relevantes para el examen;
3. prerrequisitos de alto impacto;
4. recuperación espaciada de capacidades sólidas relevantes;
5. simulaciones integradoras.

No debe convertir la semana previa al examen en repetición indiscriminada de todo el programa.

---

# 31. Global Student Orchestrator

Cada cátedra puede producir una recomendación principal.

Ejemplo:

```text
Marketing → aplicación de segmentación
Estadística → actividad requerida mañana
Innovación → continuar simulación
```

El orquestador global recibe:

```text
recommendation_id
course_section_id
priority_class
required_flag
due_at
resume_flag
urgency_band
estimated_duration
validity
```

No necesita leer evidencia académica cruda.

---

# 32. Política global entre materias

Orden inicial:

1. requerida y venciendo;
2. requerida sin vencimiento inmediato;
3. urgencia académica alta;
4. continuidad válida reciente;
5. necesidad pedagógica alta;
6. recomendación normal de avance;
7. transferencia/profundización.

Si dos recomendaciones empatan:

1. deadline más próximo;
2. importancia curricular mayor;
3. acción más breve que conserva el objetivo;
4. sesión más reciente;
5. orden estable por cátedra para evitar comportamiento aleatorio.

---

# 33. No usar un score único como verdad

El motor puede utilizar features y scores auxiliares, pero la decisión estructural debe ser explicable mediante:

- prioridad de política;
- reason codes;
- tie-break rules.

No diseñar:

```text
recommendation_score = 87.42
```

como fuente única de verdad.

Puede existir internamente una función secundaria para desempatar candidatos del mismo tipo, pero debe ser:

- configurable;
- versionada;
- auditable;
- no visible como precisión pedagógica.

---

# 34. Hard constraints

Antes de rankear, eliminar acciones incompatibles.

Ejemplos:

- requiere notebook y el alumno está en mobile sin alternativa;
- requiere un concepto todavía no introducido sin intención explícita de adelantarse;
- viola una preferencia de privacidad;
- usa un proyecto no habilitado;
- repite una evaluación cuya respuesta acaba de ser revelada;
- contradice una obligación docente;
- supera claramente el tiempo disponible;
- requiere una simulación aún no disponible;
- utiliza una capability de una currícula desactualizada.

---

# 35. Time fit

El motor puede recibir:

```text
available_time_minutes
```

Si no existe, utilizar duración estándar.

Default UX:

- microacción: 3–8 min;
- acción corta: 8–20 min;
- sesión: 20–40 min.

La Home debería preferir acciones de inicio razonable salvo que el alumno haya pedido explícitamente una sesión larga.

No reducir dificultad para acortar tiempo.

Reducir **alcance**, no estándar académico.

---

# 36. Repetition y cooldown

Evitar que Educai parezca un loop mecánico.

Guardar:

```text
recent_action_types
recent_target_capabilities
recent_contexts
recent_error_patterns
```

Reglas iniciales:

- no mostrar la misma recomendación exacta después de que el usuario la rechazó, salvo nueva evidencia;
- después de completar una acción, recalcular antes de recomendar otra igual;
- evitar más de 2 acciones puramente diagnósticas consecutivas;
- evitar más de 2 acciones del mismo formato si existe una alternativa pedagógicamente equivalente;
- un `error_retest` debe ocurrir después de alguna oportunidad de corrección.

Los límites son configurables.

---

# 37. Guardrail contra assessment fatigue

Educai no debe maximizar cobertura de evidencia a costa del aprendizaje.

Si las últimas acciones fueron principalmente:

- diagnostic probes;
- verificaciones;
- retests;

el motor debe favorecer, cuando sea pedagógicamente válido:

- explicación;
- aplicación auténtica;
- proyecto;
- exploración;
- experiencia integrada.

---

# 38. Personalización académica

La prioridad se decide primero.

La personalización ocurre después.

```text
1. decidir qué capacidad trabajar
2. decidir qué proceso cognitivo provocar
3. elegir contexto/formato apropiado
```

Perfil personal, intereses y proyectos pueden cambiar:

- industria;
- historia;
- stakeholder;
- rol;
- dataset;
- caso;
- tipo de proyecto;
- lenguaje contextual.

No pueden cambiar:

- objetivo obligatorio;
- criterio de éxito;
- capacidad requerida;
- dificultad objetivo;
- evidencia necesaria.

---

# 39. Uso del perfil profesional

El perfil global no debe alterar la prioridad académica porque:

> `interés ≠ capacidad`

Ejemplo incorrecto:

> “No le gusta análisis, entonces no recomendar estadística.”

Correcto:

> “Debe aprender estadística. Podemos contextualizar el problema en un proyecto o sector que le resulte más relevante.”

---

# 40. Uso de proyectos

Si:

```text
project.personalization_enabled = true
```

y la capacidad puede aplicarse genuinamente al proyecto, se puede producir:

```text
context_strategy = student_project
```

Ejemplo:

> Aplicá segmentación al proyecto Educai.

No usar el proyecto si:

- fuerza artificialmente el contenido;
- reduce la dificultad;
- expone información privada al docente;
- el estudiante deshabilitó su uso.

---

# 41. Relevancia + exploración

La personalización no debe crear una burbuja.

El sistema debe alternar entre:

- contextos relevantes para el estudiante;
- contextos neutrales;
- contextos nuevos.

Objetivo:

> comprobar que la capacidad se transfiere y ampliar exposición profesional.

No fijar en UI porcentajes como “70% personalizado / 30% exploratorio”.

La política debe ser configurable y evaluarse longitudinalmente.

---

# 42. Autonomía del estudiante

La recomendación principal no elimina elección.

Home:

> **Tu próximo paso**

Secundario:

> **Quiero hacer otra cosa**

Intenciones manuales:

```text
understand_better
practice
test_myself
deepen
advance_project
continue_previous
explore_subject
```

El motor re-rankea acciones compatibles con esa intención.

No debe permitir que la elección manual evite permanentemente competencias obligatorias.

---

# 43. Student intent como override parcial

Ejemplo:

El sistema recomienda practicar aplicación.

El alumno elige:

> “Quiero entender mejor.”

Educai puede cambiar:

```text
application_challenge
```

por:

```text
guided_explanation + contrastive_example
```

pero conserva la capability objetivo.

Si existe una acción docente obligatoria, mostrar claramente que sigue pendiente.

---

# 44. Desacuerdo del estudiante

Acción:

> **No estoy de acuerdo**

Opciones sugeridas:

- Esto ya lo puedo hacer.
- No creo que ese sea mi principal problema.
- La actividad anterior no reflejó lo que sé.
- Prefiero otra forma de trabajarlo.
- Otra razón.

El desacuerdo:

- no cambia automáticamente el estado académico;
- se registra como feedback de recomendación;
- puede disparar un `contradiction_resolution` o una alternativa;
- puede ayudar a detectar problemas de interpretación.

---

# 45. Explicabilidad para estudiante

Toda recomendación académica importante debe poder mostrar:

> **¿Por qué esto?**

Construir explicación desde reason codes estructurados.

Ejemplo:

> Ya explicaste correctamente TAM y SAM. En dos situaciones confundiste SAM y SOM y todavía no tenemos una aplicación independiente a un caso propio. Por eso te proponemos trabajar ese contraste ahora.

No mostrar:

- scores internos;
- prompts;
- razonamiento privado del modelo;
- falsa precisión.

---

# 46. `reason_codes`

Catálogo estudiante inicial:

```text
TEACHER_REQUIRED
TEACHER_RECOMMENDED
RESUME_RECENT_SESSION
ASSESSMENT_NEAR
CONFIRMED_ERROR_PATTERN
PREREQUISITE_RISK
INSUFFICIENT_EVIDENCE
UNASSISTED_EVIDENCE_NEEDED
HIGHER_COGNITIVE_LEVEL_NEEDED
NEW_CONTEXT_NEEDED
TRANSFER_NEEDED
CONTRADICTION_NEEDS_RESOLUTION
NEXT_CURRICULUM_CAPABILITY
SPACED_RETRIEVAL_DUE
STUDENT_SELECTED_INTENT
PROJECT_APPLICATION_AVAILABLE
```

---

# 47. Recomendación docente — principio

La recomendación docente responde:

> **Dado el estado agregado del aula, ¿qué intervención tiene más sentido para la próxima clase?**

Nunca:

> “¿Qué alumno debería ser señalado?”

La unidad es:

- capacidad;
- patrón agregado;
- clase/cátedra;
- intervención.

---

# 48. Qué prioriza el docente

La Home puede mostrar hasta tres hallazgos, pero una intervención principal.

La prioridad no depende solamente del porcentaje.

Considerar:

- `needs_review_rate`;
- importancia curricular;
- centralidad como prerrequisito;
- evaluación próxima;
- severidad del error;
- tendencia;
- cobertura de evidencia;
- intervención previa;
- cercanía al tema actual.

Ejemplo:

> 35% con dificultad en un prerrequisito central antes del parcial

puede tener prioridad sobre:

> 55% con una dificultad secundaria que no afecta lo próximo.

---

# 49. Eligibility de un hallazgo docente

Una recomendación docente basada en aprendizaje requiere:

1. agregado por encima del umbral de privacidad;
2. evidencia suficiente en una cantidad razonable de estudiantes;
3. capability activa/relevante;
4. finding no invalidado por cambios recientes;
5. interpretación agregada trazable.

Default de privacidad heredado de Interpretation Engine:

```text
min_group_size = 5
```

Parametrizable.

---

# 50. Cobertura insuficiente como finding

Baja cobertura no significa bajo aprendizaje.

Si una capacidad importante tiene poca evidencia:

> **Necesitamos observar mejor antes de concluir.**

Recomendación posible:

> mini experiencia diagnóstica / exit ticket / escenario breve.

No:

> “El aula no entiende.”

Default inicial configurable:

```text
low_evidence_coverage < 0.50
```

para capacidades activas importantes.

---

# 51. Error pattern agregado

Si un patrón aparece en suficientes estudiantes, el motor puede recomendar una intervención específica.

Ejemplo:

> **Product Owner vs Scrum Master**
>
> 12 de 27 estudiantes con evidencia suficiente muestran una confusión recurrente respecto de impedimentos.

Estrategia:

> contraste + decisiones ambiguas + retest.

No:

> explicación general de todos los roles Scrum.

---

# 52. Cognitive gap del aula

Ejemplo:

```text
explicar = mayormente sólido
aplicar = en desarrollo / review
```

Recomendación:

> reducir exposición teórica y aumentar situaciones de decisión.

Este es un finding diferente de:

> “no conocen la definición”.

---

# 53. Feedback de clase como input

El feedback del estudiante puede modificar la **forma de la intervención**.

Ejemplo:

```text
learning finding:
confusión PO vs SM

feedback pattern:
piden ejemplos concretos
```

Resultado:

> escenario concreto de decisiones.

No usar feedback subjetivo como evidencia de que una capacidad fue o no aprendida.

---

# 54. Contexto físico del aula

Antes de recomendar formato docente, filtrar por:

- duración;
- cantidad de estudiantes;
- celulares;
- notebooks;
- proyector;
- pizarrón;
- mesas;
- posibilidad de grupos.

Ejemplo:

Si no hay dispositivos:

```text
strategy = decision_scenario
format_hint = paper_cards
```

No eliminar la estrategia pedagógica solo porque no puede ser digital.

---

# 55. Aggregate profile context

El perfil agregado puede ayudar a elegir contextos de clase.

Ejemplo:

> alta presencia de proyectos/emprendimientos

puede favorecer un caso empresarial.

Pero no debe decidir:

- qué capacidad priorizar;
- quién está en dificultad;
- qué estudiantes pertenecen a cada orientación.

---

# 56. Modo pre-parcial docente

Cuando un hito evaluativo está cerca, la Home puede priorizar:

> **Antes del parcial conviene reforzar**

Rankear:

1. capacidades importantes en `needs_review`;
2. errores agregados recurrentes;
3. capacidades centrales `developing`;
4. cobertura insuficiente en objetivos evaluables;
5. recuperación de capacidades sólidas importantes.

Acción:

> **Crear clase de repaso**

El Experience Engine puede generar una secuencia integradora.

---

# 57. Seguimiento de intervención docente

Después de aplicar una intervención:

```text
finding
↓
recommendation
↓
intervention
↓
new evidence
↓
new classroom interpretation
```

El Recommendation Engine debe evitar recomendar inmediatamente la misma intervención antes de recibir suficiente nueva evidencia, salvo que el docente la solicite.

Guardar:

```text
intervention_id
recommendation_id
target_capability_ids
strategy
applied_at
follow_up_status
```

---

# 58. Teaching practice recommendation

Separada de la prioridad académica.

Ejemplo:

> **Qué podés mejorar en tu próxima clase**
>
> Usá más ejemplos concretos antes de pasar a la actividad.

Fuentes permitidas:

- feedback anónimo agregado;
- historial de clase;
- validaciones docentes;
- patrones suficientemente agregados.

No inferir calidad docente a partir de una sola clase o comentario.

---

# 59. Catálogo de reason codes docente

```text
CLASS_CONFIRMED_ERROR_PATTERN
CLASS_COGNITIVE_GAP
CLASS_LOW_EVIDENCE_COVERAGE
CLASS_PREREQUISITE_RISK
CLASS_ASSESSMENT_NEAR
CLASS_NEGATIVE_TREND
CLASS_INTERVENTION_FOLLOWUP
CLASS_NEXT_CURRICULUM_OBJECTIVE
CLASS_FEEDBACK_PATTERN
CLASS_RETRIEVAL_DUE
```

---

# 60. Recommendation → Experience Engine contract

El Recommendation Engine no debe decir solo:

> “hacé una actividad”.

Debe producir un `ActionSpec` suficientemente preciso.

```json
{
  "objective": "Resolver la confusión PO vs SM en impedimentos.",
  "target_capabilities": ["CAP-SCRUM-04"],
  "mode": "remediate",
  "strategy": "contrast_then_independent_retest",
  "target_cognitive_level": "apply",
  "estimated_duration_minutes": 12,
  "delivery_constraints": {
    "mobile_supported": true,
    "group_size": null
  },
  "personalization": {
    "allowed": true,
    "preferred_context": "student_project_or_neutral"
  },
  "evidence_contract": {
    "required_opportunities": 2,
    "assistance_ceiling": "light_prompting",
    "independence_required": true,
    "target_error_pattern_id": "err_22"
  }
}
```

---

# 61. Evidence contract de una recomendación

Toda recomendación académica debería declarar qué evidencia espera producir.

Campos sugeridos:

```text
target_capability_ids
expected_cognitive_level
required_opportunity_count
independence_required
assistance_ceiling
error_pattern_to_test
contradiction_to_resolve
success_observation
failure_observation
```

Esto cierra el loop:

> recomendación → experiencia → evidencia → interpretación.

---

# 62. Recommendation bundles

Una recomendación puede contener una secuencia breve de microacciones.

Ejemplo:

```text
1. ver contraste
2. resolver 2 casos
3. explicar decisión
```

Pero la UI debe presentarlo como una sola misión coherente.

Default:

```text
max_microsteps = 3
```

salvo sesiones explícitamente más largas.

---

# 63. Responsabilidad del LLM

El LLM puede ayudar a:

- proponer estrategias compatibles con un intent;
- generar variantes de contexto;
- traducir reason codes a lenguaje natural;
- adaptar ejemplos a un proyecto;
- redactar explicación corta;
- proponer formatos pedagógicos bajo restricciones;
- generar alternativas creativas dentro de un catálogo permitido.

---

# 64. Qué NO debe decidir libremente el LLM

El LLM no debería decidir sin reglas estructurales:

- si una acción docente obligatoria tiene prioridad;
- si existe `needs_review`;
- qué capability es obligatoria;
- qué deadline existe;
- el nivel de privacidad;
- si una cátedra puede leer evidencia de otra;
- si un alumno debe ser identificado al docente;
- si una recomendación vencida sigue activa;
- si puede reducir dificultad;
- si una acción produce evidencia suficiente;
- la prioridad estructural final cuando existen candidatos de distinta clase.

---

# 65. Selección de estrategia

Después de fijar el intent, seleccionar estrategia según reglas.

Ejemplos:

### misconception confirmada

Preferir:

```text
contrastive_example
→ error_focused_practice
→ independent_attempt
```

### falta evidencia autónoma

Preferir:

```text
independent_attempt
```

### falta nivel cognitivo

Preferir tarea en:

```text
current_reliable_level + 1
```

sin saltos innecesarios.

### transferencia

Preferir:

```text
new_context
```

idealmente con menos scaffolding.

---

# 66. Progressive difficulty

El motor debe tender a:

```text
comprender
→ aplicar
→ resolver
→ transferir
```

pero no usarlo como secuencia rígida.

Reglas:

- no enviar a transferencia si aplicación todavía requiere review;
- no repetir explicación si ya existe evidencia sólida de explicación y el problema es aplicación;
- permitir saltos cuando evidencia fuerte de nivel superior ya existe;
- si un nivel superior falla, localizar la falla en la capability adecuada en lugar de degradar todo.

---

# 67. Recommendation lifecycle

Estados:

```text
generated
surfaced
accepted
started
in_progress
completed
dismissed
disagreed
expired
superseded
cancelled
```

Transición típica:

```text
generated
→ surfaced
→ started
→ completed
→ outcome_pending
→ closed
```

`outcome_pending` puede manejarse en un objeto separado si se prefiere.

---

# 68. RecommendationOutcome

Objeto sugerido:

```json
{
  "recommendation_id": "rec_123",
  "action_completed": true,
  "linked_experience_run_ids": ["run_91"],
  "new_evidence_event_ids": ["ev_1", "ev_2"],
  "before_interpretation_id": "int_1",
  "after_interpretation_id": "int_2",
  "outcome": "improved",
  "student_feedback": "useful",
  "computed_at": "..."
}
```

Valores posibles de `outcome`:

```text
improved
stable
insufficient_new_evidence
new_difficulty_detected
regressed
unknown
```

No interpretar `improved` como causalidad demostrada.

---

# 69. Invalidation

Una recomendación debe recalcularse o invalidarse si:

- cambia una interpretación relevante;
- aparece nueva evidencia significativa;
- se elimina la fuente que la sostenía;
- cambia la currícula activa;
- el docente modifica prioridad/deadline;
- la acción ya fue completada;
- vence;
- el alumno cambió de cátedra;
- una obligación nueva la supersede;
- la experiencia asociada deja de estar disponible.

---

# 70. Supersession

No borrar recomendaciones históricas.

Guardar:

```text
superseded_by_recommendation_id
supersession_reason
```

Ejemplo:

> Antes recomendábamos aplicación. Nueva evidencia confirmó un error específico, por lo que ahora priorizamos remediación.

---

# 71. Expiration

Cada recomendación debe tener una validez coherente.

Ejemplos:

- tarea con deadline → hasta deadline;
- continuar sesión → ventana corta;
- dificultad académica → hasta nueva interpretación o intervención;
- recomendación pre-parcial → hasta el parcial;
- teaching feedback → hasta próxima clase o nueva medición.

No usar un TTL único para todo.

---

# 72. Versionado y auditabilidad

Guardar:

```text
recommendation_engine_version
policy_version
strategy_catalog_version
source_interpretation_versions
curriculum_version_id
profile_version_if_used
project_version_if_used
created_at
```

Mismos inputs estructurales + misma versión de política deben producir la misma prioridad estructural.

El wording puede variar, pero no la regla central.

---

# 73. Privacidad

## Estudiante

Puede recibir recomendaciones basadas en su propia evidencia y perfil.

## Docente

Solamente recomendaciones basadas en:

- agregados seguros;
- datos de cátedra;
- feedback anónimo;
- contexto físico;
- currícula.

Nunca incluir:

- nombre asociado a dificultad;
- proyecto privado;
- perfil profesional individual;
- fragmentos reidentificables.

---

# 74. Aislamiento por cátedra

Una recomendación académica de una cátedra no puede utilizar evidencia académica individual proveniente de otra cátedra.

Sí puede utilizar contexto global autorizado para personalización:

- intereses;
- proyectos;
- preferencias;

pero no:

> “Como te fue mal en Estadística, te recomendamos esto en Marketing.”

salvo que exista en el futuro un modelo explícito de competencias transversales con consentimiento y gobernanza específica.

No forma parte de v1.

---

# 75. Fairness y no castigo por falta de uso

Poca evidencia no significa baja capacidad.

El motor no debe:

- penalizar al estudiante por usar poco Educai;
- convertir inactividad en `needs_review`;
- recomendar tareas remediales solamente por ausencia de datos.

Puede decir:

> **Todavía no tenemos suficiente evidencia.**

Y, si la capacidad es relevante:

> proponer una oportunidad útil para observarla.

---

# 76. Pseudocódigo — Section Recommendation Engine

```text
function recommend_for_section(student, section):
    context = load_section_context(student, section)
    interpretations = load_current_interpretations(student, section)

    candidates = []

    candidates += active_teacher_actions(context)
    candidates += valid_resume_candidates(context)
    candidates += assessment_candidates(context, interpretations)
    candidates += review_candidates(interpretations)
    candidates += next_evidence_candidates(interpretations)
    candidates += prerequisite_candidates(interpretations, context.curriculum)
    candidates += curriculum_advance_candidates(context, interpretations)
    candidates += transfer_candidates(context, interpretations)

    candidates = apply_hard_constraints(candidates, context)
    candidates = remove_stale_and_duplicate_candidates(candidates, context)

    if has_required_active_action(candidates):
        return select_required(candidates)

    if has_valid_resume(candidates) and not has_urgent_override(candidates):
        return best_resume(candidates)

    ranked = rank_by_policy(candidates, context)
    selected = ranked[0]

    selected = personalize_context(selected, student.profile, student.projects)
    selected = build_explanation(selected)
    selected = attach_evidence_contract(selected)

    return selected
```

---

# 77. Pseudocódigo — Global Student Orchestrator

```text
function global_next_action(student):
    section_recommendations = []

    for section in student.active_sections:
        rec = recommend_for_section(student, section)
        if rec is not null:
            section_recommendations.append(to_global_metadata(rec))

    candidates = filter_valid(section_recommendations)

    if any(required_and_due_soon(candidates)):
        return earliest_due_required(candidates)

    if any(required(candidates)):
        return highest_required(candidates)

    if any(high_urgency(candidates)):
        return highest_urgency(candidates)

    if any(valid_recent_resume(candidates)):
        return most_recent_resume(candidates)

    return deterministic_policy_rank(candidates)[0]
```

---

# 78. Pseudocódigo — Teacher Recommendation Engine

```text
function recommend_for_teacher(section):
    summaries = load_classroom_capability_summaries(section)
    feedback = load_aggregate_feedback(section)
    schedule = load_schedule(section)
    classroom = load_classroom_context(section)

    findings = build_privacy_safe_findings(summaries)
    findings += build_low_coverage_findings(summaries)
    findings += build_assessment_findings(summaries, schedule)

    findings = filter_by_curriculum_relevance(findings, section)
    findings = rank_classroom_priorities(findings, schedule)

    primary = findings[0] if findings else build_advance_finding(section)

    strategy_candidates = strategies_for(primary)
    strategy_candidates = adapt_with_feedback(strategy_candidates, feedback)
    strategy_candidates = filter_by_classroom_constraints(strategy_candidates, classroom)

    strategy = select_strategy(strategy_candidates)

    return build_teacher_recommendation(primary, strategy)
```

---

# 79. Ejemplo end-to-end 1 — En desarrollo por falta de autonomía

Interpretation Engine:

```text
visible_state = in_development
highest_reliably_demonstrated_level = apply
next_evidence_need = unassisted_attempt
recent evidence = scaffolded
```

Recommendation Intent:

```text
verify_autonomy
```

Recommendation:

> **Probalo sin pistas**  
> Resolvé dos situaciones nuevas de aplicación.  
> 6 min.

¿Por qué?

> Ya pudiste resolver situaciones con ayuda. Ahora necesitamos comprobar si podés hacerlo de manera independiente.

Evidence contract:

```text
2 independent opportunities
assistance <= light_prompting
level = apply
```

---

# 80. Ejemplo end-to-end 2 — Conviene revisar

Interpretation:

```text
attention_state = review
error = PO/SM impediments confusion
```

Recommendation:

> **Aclará quién hace qué cuando aparece un impedimento**  
> Mirá un contraste corto y resolvé tres situaciones.  
> 10 min.

Sequence:

```text
contrast
→ 2 practice cases
→ independent retest
```

No recomendar:

> “Volvé a estudiar Scrum completo.”

---

# 81. Ejemplo end-to-end 3 — Contradicción

Interpretation:

```text
chat = positive explanation
simulation = negative application
contradiction = level_gap
next_evidence_need = contradiction_resolution
```

Recommendation:

> **Explicar no alcanza: probemos una decisión real**

La actividad presenta situaciones donde no puede responder mediante definición memorizada.

Objetivo:

> determinar si la dificultad está en aplicación.

---

# 82. Ejemplo end-to-end 4 — Evidencia sólida

Interpretation:

```text
visible_state = solid
highest_reliably_demonstrated_level = apply
next_evidence_need = transfer_opportunity
```

Curriculum:

> todavía no existe un nuevo objetivo urgente.

Proyecto habilitado:

> Educai.

Recommendation:

> **Aplicá este criterio a tu proyecto**

No para “practicar más de lo mismo”, sino para comprobar transferencia.

---

# 83. Ejemplo end-to-end 5 — Continuar donde quedó

Ayer:

> estudiante empezó una simulación de validación de hipótesis.

Estado:

```text
60% completed
last_activity = 14 horas
still_valid = true
no urgent override
```

Home:

> **Continuar validación de hipótesis**

No obligar a reconstruir:

> materia → tema → actividad.

---

# 84. Ejemplo end-to-end 6 — Dos materias

Marketing:

```text
normal priority
application challenge
```

Estadística:

```text
teacher required
due tomorrow
```

Global Home:

> **Estadística — actividad de tu docente**

Marketing queda en:

> Otros pendientes.

No mezclar las evidencias de ambas materias.

---

# 85. Ejemplo end-to-end 7 — Aula

Summary:

```text
27 estudiantes con evidencia suficiente
12 needs_review
error principal = PO vs SM impediments
assessment = 10 días
```

Feedback:

> varios estudiantes piden ejemplos más concretos.

Teacher recommendation:

> **Qué necesita tu aula hoy**  
> Trabajar decisiones de roles en situaciones concretas.
>
> **Experiencia recomendada:** “¿Quién debería intervenir?” — 15 min.

Rationale:

> 12 de 27 estudiantes con evidencia suficiente muestran una dificultad recurrente al asignar responsabilidades en impedimentos.

---

# 86. Ejemplo end-to-end 8 — Baja cobertura

Summary:

```text
capability = Sprint Retrospective
coverage = 22%
needs_review_rate = unreliable
```

No decir:

> “El aula necesita revisar Retrospectiva.”

Decir:

> **Todavía no tenemos suficiente evidencia sobre Retrospectiva.**

Recomendación docente:

> lanzar un exit ticket de 5 minutos.

---

# 87. Casos límite

## 87.1. `unknown` antes de enseñar

No diagnosticar automáticamente.

Recomendar introducción cuando corresponde.

## 87.2. `unknown` después de enseñar un tema importante

Puede recomendar microdesafío para generar evidencia.

## 87.3. `solid` + error aislado

No remediar inmediatamente como si hubiese regresión.

Puede esperar nueva evidencia o proponer recuperación ligera.

## 87.4. `needs_review` + actividad docente obligatoria diferente

La obligación puede aparecer primero, pero el motor conserva la dificultad pendiente.

## 87.5. Proyecto incompatible

No forzar personalización.

## 87.6. Alumno rechaza tres veces el mismo formato

Cambiar formato si existe alternativa válida; no cambiar capability obligatoria.

## 87.7. Alumno sin tiempo declarado

Usar duración estándar y permitir:

> “Tengo solo 5 minutos”.

## 87.8. Docente con grupo menor al threshold

No producir recomendaciones basadas en agregados que puedan reidentificar.

Puede usar currícula, cronograma y feedback cuando sea seguro.

## 87.9. Currícula cambia

Invalidar recomendaciones que apunten a capabilities versionadas como inactivas.

## 87.10. Fuente eliminada

Recalcular interpretación primero y luego recomendación.

---

# 88. Métricas del Recommendation Engine

## 88.1. Recommendation Start Rate

```text
recomendaciones iniciadas / recomendaciones surfaced
```

## 88.2. Recommendation Completion Rate

```text
recomendaciones completadas / recomendaciones iniciadas
```

## 88.3. Recommendation Agreement Rate

Porcentaje en el que el estudiante indica que la recomendación tiene sentido cuando se solicita feedback.

## 88.4. Recommendation Disagreement Rate

Y distribución de motivos.

## 88.5. Time to Action

Tiempo entre recommendation surfaced y started.

Debe interpretarse con cautela; no es una métrica de aprendizaje por sí sola.

## 88.6. Closed Learning Loop Rate

```text
recommendation
→ action
→ new evidence
→ interpretation update
→ next recommendation
```

## 88.7. Capability Progression After Recommendation

Proporción de recomendaciones seguidas por una progresión respaldada por nueva evidencia.

No atribuir causalidad automáticamente.

## 88.8. Evidence Yield

Proporción de acciones que generan evidencia elegible y útil sobre la capability objetivo.

## 88.9. Stale Recommendation Rate

Recomendaciones mostradas que ya deberían haber sido invalidadas.

Objetivo: cercano a cero.

## 88.10. Repetition Rate

Frecuencia de recomendaciones equivalentes repetidas sin nueva justificación.

## 88.11. Teacher Recommendation → Intervention Rate

Cuántos hallazgos recomendados se convierten en una acción docente.

## 88.12. Teacher Usefulness

Evaluación rápida del docente:

- útil;
- parcialmente útil;
- no útil.

---

# 89. Métricas de outcome por estrategia

Registrar, sin afirmar causalidad:

```text
strategy
capability type
error type
cognitive level
before state
after state
time to new evidence
```

A largo plazo esto crea una base para responder:

> **¿Qué estrategias parecen funcionar mejor para qué tipos de dificultad?**

En v1 esta información se analiza offline.

No debe autoajustar silenciosamente la política principal.

---

# 90. Dataset de evaluación interna

Construir casos sintéticos y casos anonimizados revisados humanamente.

Incluir:

- teacher required vs recomendación normal;
- resume reciente válido;
- resume obsoleto;
- assessment cercano;
- needs_review con error específico;
- developing con `unassisted_attempt`;
- developing con `higher_cognitive_level`;
- contradiction resolution;
- solid + transfer;
- prerequisite risk;
- low evidence coverage;
- proyecto disponible/no disponible;
- restricciones de dispositivo;
- alumno que rechaza formato;
- múltiples materias;
- teacher feedback que cambia formato;
- grupos debajo de privacy threshold;
- evidencia eliminada;
- currícula versionada.

Cada caso debe tener:

```text
expected_priority_class
expected_target_capability
allowed_action_types
forbidden_action_types
expected_reason_codes
expected_privacy_behavior
```

---

# 91. Criterios de aceptación — estudiante

Recommendation Engine v1 está listo cuando:

1. una actividad docente `required` activa puede ganar prioridad;
2. una sesión reciente válida puede aparecer como “Continuar donde quedaste”;
3. una urgencia académica puede superseder continuidad cuando corresponde;
4. `needs_review` genera una acción específica al error y no un repaso genérico;
5. `unassisted_attempt` produce una oportunidad sin ayuda sustancial;
6. `higher_cognitive_level` eleva adecuadamente la demanda;
7. `transfer_opportunity` produce un contexto nuevo;
8. un proyecto puede personalizar sin modificar objetivo ni criterio;
9. una preferencia profesional no elimina una competencia obligatoria;
10. el alumno puede pedir otra forma de trabajar el mismo objetivo;
11. el desacuerdo no modifica automáticamente el estado académico;
12. recomendaciones stale son invalidadas;
13. la misma recomendación no se repite mecánicamente sin nueva razón;
14. cada recomendación importante puede explicar por qué existe;
15. la recomendación declara qué evidencia espera producir.

---

# 92. Criterios de aceptación — docente

El motor docente está listo cuando:

1. utiliza únicamente agregados seguros;
2. no expone nombres ni perfiles individuales;
3. puede distinguir dificultad de baja cobertura;
4. no rankea solo por porcentaje;
5. considera importancia curricular y prerrequisitos;
6. puede priorizar antes de una evaluación;
7. adapta estrategia al contexto físico;
8. usa feedback para modificar formato, no estado académico;
9. entrega una intervención principal concreta;
10. puede producir una recomendación de mejora docente separada;
11. espera nueva evidencia antes de repetir automáticamente una intervención;
12. mantiene trazabilidad hasta los classroom findings que la originaron.

---

# 93. Hipótesis a calibrar en piloto

No deben tratarse como científicamente cerradas:

- `resume_window = 72 horas`;
- `assessment_near <= 7 días`;
- `low_evidence_coverage < 0.50`;
- máximo 2 diagnósticos consecutivos;
- máximo 2 formatos equivalentes consecutivos;
- `max_microsteps = 3`;
- duración estándar de microacciones;
- reglas de prioridad entre resume y urgencia;
- thresholds de teacher priority;
- cadence de spaced retrieval;
- momento óptimo para transferir;
- política de relevancia vs exploración;
- cuánto pesa la utilidad percibida al elegir estrategia futura.

Todos estos valores deben ser configurables y versionados.

---

# 94. Política de aprendizaje del propio motor

V1 debe ser principalmente:

> **rule-based + LLM-assisted**

No:

> **LLM decides everything**

ni:

> **reinforcement learning autónomo en producción**.

Registrar outcomes suficientes para construir posteriormente modelos de efectividad.

Cualquier adaptación futura de la política debe:

- ser versionada;
- evaluarse offline;
- correr contra dataset de regresión;
- respetar guardrails;
- poder rollbackearse.

---

# 95. Relación con el Experience Engine

El Recommendation Engine entrega:

> **qué resultado pedagógico queremos provocar.**

El Experience Engine resuelve:

> **qué experiencia concreta puede provocar ese resultado.**

Ejemplo:

```text
Recommendation Engine

objetivo = corregir confusión PO/SM
strategy = contrast_then_independent_retest
cognitive level = apply
evidence = 2 independent opportunities
constraints = mobile, 10 min

↓

Experience Engine

“¿Quién debería intervenir?”
6 escenarios interactivos
feedback contrastivo
2 casos finales sin pistas
```

---

# 96. Relación con el Asistente Docente

El Recommendation Engine puede entregar al Asistente:

```text
primary_classroom_need
recommended_strategy
why
constraints
evidence_goal
```

El Asistente puede producir:

- plan de clase;
- presentación;
- actividad;
- worksheet;
- simulación;
- preguntas;
- cierre.

El docente conserva control final.

---

# 97. Arquitectura final

```text
                    CURRICULUM MODEL
                           +
                  INTERPRETATION ENGINE
                           +
             TEMPORAL / COURSE CONTEXT
                           +
                USER / CLASS CONTEXT
                           ↓
        ┌────────────────────────────────┐
        │      RECOMMENDATION ENGINE     │
        │                                │
        │ Candidate generation           │
        │ Policy / priority              │
        │ Hard constraints               │
        │ Strategy selection             │
        │ Continuity                     │
        │ Personalization adapter        │
        │ Explanation                    │
        │ Evidence contract              │
        │ Lifecycle / invalidation       │
        └────────────────────────────────┘
                    ↓              ↓
             STUDENT REC       TEACHER REC
                    ↓              ↓
        EXPERIENCE ENGINE    ASSISTANT / EXPERIENCE
                    └───────┬──────┘
                            ↓
                      ACTION / CLASS
                            ↓
                      NEW EVIDENCE
                            ↓
                 INTERPRETATION UPDATE
                            ↓
                 NEW RECOMMENDATION
```

---

# 98. Definición final

> **El Recommendation Engine de Educai transforma una interpretación académica actual en una próxima acción concreta, priorizada y explicable, diseñada para maximizar aprendizaje útil y generar la evidencia que permita tomar una mejor decisión después.**

Su unidad central no es:

> “¿Qué contenido debería mostrar?”

Sino:

> **¿Qué experiencia o intervención tiene mayor sentido ahora, dado lo que sabemos, lo que falta saber y lo que la currícula exige?**

Para el estudiante, esto permite que Educai funcione como:

> **un sistema que reduce la incertidumbre sobre qué hacer a continuación.**

Para el docente:

> **un sistema que convierte información del aula en una próxima intervención pedagógica concreta.**

Y para el producto completo, cierra la cadena:

> **currícula → evidencia → interpretación → recomendación → experiencia → nueva evidencia.**