# Educai — Experience Engine / Runtime de Experiencias

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo de documento:** Product + System Specification  
**Estado:** Especificación funcional para implementación  
**Dependencias:** PRD Maestro v1.0 + Modelo Curricular v1 + Evidence Engine v1 + Interpretation Engine v1 + Recommendation Engine v1  

---

# 0. Resumen ejecutivo

El **Experience Engine** es la capa de Educai que transforma una recomendación pedagógica estructurada en una experiencia de aprendizaje concreta, ejecutable e instrumentada.

El **Runtime de Experiencias** es la infraestructura que ejecuta esa experiencia, conserva su estado, registra interacciones, administra feedback y asistencia, y entrega eventos confiables al Evidence Engine.

La separación es deliberada:

```text
RECOMMENDATION ENGINE
qué conviene hacer y con qué objetivo
        ↓
EXPERIENCE ENGINE
cómo diseñar una experiencia adecuada
        ↓
EXPERIENCE DEFINITION
qué se va a ejecutar y qué evidencia debe producir
        ↓
RUNTIME DE EXPERIENCIAS
la experiencia ocurre
        ↓
INTERACTION EVENTS
qué hizo realmente el estudiante
        ↓
EVIDENCE ENGINE
qué evidencia académica aporta
```

El Experience Engine no debe limitarse a seleccionar actividades de una biblioteca. Puede generar experiencias digitales de alta calidad mediante agentes de programación como Claude Code o Codex: simulaciones, escenarios interactivos, laboratorios virtuales, modelos manipulables, juegos de decisión, sistemas causa-efecto y otras interfaces específicas para el objetivo pedagógico.

Sin embargo, la libertad de generación está contenida por un contrato estricto. Toda experiencia que pretenda alimentar el modelo académico de Educai debe declarar antes de ejecutarse:

- qué capacidades busca desarrollar u observar;
- qué nivel cognitivo exige;
- qué oportunidades de evidencia contiene;
- qué comportamientos son informativos;
- cuándo una ayuda modifica la independencia de la evidencia;
- cuándo se revela feedback;
- qué eventos debe emitir;
- qué condiciones determinan finalización;
- qué datos puede utilizar;
- qué datos nunca puede exponer.

El principio rector es:

> **Una experiencia de Educai no es solamente contenido interactivo. Es una situación diseñada para producir aprendizaje y, cuando corresponde, evidencia interpretable sobre ese aprendizaje.**

El motor debe priorizar la calidad pedagógica por encima de la espectacularidad técnica. Una simulación 3D solo es superior a una discusión con tarjetas si la representación espacial o sistémica mejora realmente el proceso mental requerido.

---

# 1. Objetivo

El Experience Engine / Runtime debe:

1. consumir `Recommendation` y `ActionSpec` del Recommendation Engine;
2. convertir una intención pedagógica en una experiencia concreta;
3. seleccionar el formato más adecuado a la capacidad, el nivel cognitivo y las restricciones reales;
4. generar experiencias digitales personalizadas cuando aporten valor;
5. generar experiencias presenciales o híbridas cuando sean más adecuadas;
6. preservar el objetivo académico y el contrato de evidencia durante la personalización;
7. ejecutar experiencias de forma segura y reproducible;
8. registrar cada interacción relevante mediante eventos estandarizados;
9. distinguir acciones de aprendizaje, ayudas, intentos, feedback y nuevas oportunidades;
10. evitar contaminar oportunidades independientes revelando respuestas demasiado pronto;
11. producir feedback útil sin confundir enseñanza con evaluación;
12. permitir reintentos y aprendizaje después del error;
13. soportar experiencias individuales, por parejas, grupales y de aula completa;
14. preservar anonimato en la vista docente;
15. permitir lanzamiento mediante enlace, código o QR;
16. ofrecer estado agregado en vivo al docente;
17. soportar pausa, reanudación y recuperación ante fallos;
18. versionar experiencias y fijar la versión utilizada por cada estudiante;
19. validar código generado antes de ejecutarlo;
20. entregar eventos compatibles con el Evidence Engine;
21. registrar resultados para evaluar qué tipos de experiencias funcionan mejor;
22. mantener aislamiento estricto entre cátedras.

---

# 2. Qué NO hace

El Experience Engine no debe:

- decidir qué capacidad priorizar;
- reinterpretar por su cuenta el estado académico;
- cambiar el `RecommendationIntent` sin justificación explícita;
- reducir objetivos académicos por preferencias del estudiante;
- inferir que una experiencia entretenida fue pedagógicamente efectiva;
- usar tiempo de interacción como evidencia de aprendizaje por sí solo;
- inferir capacidad individual a partir de desempeño grupal sin captura individual;
- revelar nombres o estados individuales al docente durante una experiencia;
- ejecutar código generado con acceso libre a secretos, bases de datos o APIs internas;
- permitir dependencias arbitrarias no validadas;
- generar experiencias visualmente complejas cuando una mecánica simple es más adecuada;
- considerar cada click como una oportunidad de evidencia;
- ocultar ayudas para hacer parecer independiente una respuesta asistida;
- mezclar datos o experiencias pedagógicas entre cátedras;
- reutilizar automáticamente una experiencia de una cátedra en otra;
- sustituir el juicio final del docente en experiencias de aula;
- afirmar que una experiencia causó aprendizaje solo porque el estado cambió después.

---

# 3. Principio rector: aprendizaje + evidencia

Toda experiencia puede perseguir uno o ambos objetivos:

```text
A. APRENDER
comprender, practicar, recibir feedback, corregir

B. DEMOSTRAR
producir una acción suficientemente independiente e informativa
```

En muchos casos una misma experiencia hace ambas cosas, pero el sistema debe saber en qué momento está enseñando y en qué momento está observando.

Ejemplo:

```text
1. escenario inicial independiente
2. respuesta del estudiante
3. feedback explicativo
4. práctica guiada
5. escenario nuevo independiente
```

El paso 1 puede aportar evidencia inicial.

Los pasos 3–4 son principalmente aprendizaje.

El paso 5 puede aportar nueva evidencia independiente si el escenario es suficientemente diferente y la respuesta anterior no lo resuelve directamente.

Esta separación es fundamental para evitar que Educai “enseñe la respuesta” y luego trate la repetición como demostración autónoma.

---

# 4. Alcance de v1

Experience Engine v1 debe soportar cinco adaptadores de ejecución:

```text
1. conversational
2. interactive_web
3. teacher_led
4. artifact_based
5. hybrid
```

## 4.1. Conversational

Experiencias ejecutadas principalmente mediante la IA integrada de Educai.

Ejemplos:

- explicación guiada;
- diálogo socrático;
- práctica de recuperación;
- caso conversacional;
- defensa de una decisión;
- tutoría adaptativa.

## 4.2. Interactive web

Microaplicaciones o simulaciones ejecutables en navegador.

Ejemplos:

- simulación de decisiones;
- laboratorio virtual;
- sistema causa-efecto;
- modelo 3D manipulable;
- diagrama interactivo;
- juego estratégico;
- línea de tiempo manipulable;
- simulación de proyecto.

## 4.3. Teacher-led

Experiencias presenciales conducidas por el docente.

Ejemplos:

- debate;
- role play;
- tarjetas de decisión;
- trabajo en pizarra;
- caso grupal;
- peer instruction;
- dinámica de movimiento;
- discusión estructurada.

## 4.4. Artifact-based

Experiencias cuyo output principal es un artefacto.

Ejemplos:

- propuesta de valor;
- análisis;
- mapa conceptual;
- prototipo;
- modelo financiero;
- informe;
- código;
- presentación;
- experimento.

## 4.5. Hybrid

Combinan componentes digitales y presenciales.

Ejemplo:

> decisión individual en el celular → discusión en parejas → votación de aula → nueva respuesta individual.

---

# 5. Contrato de entrada desde Recommendation Engine

El Experience Engine recibe una `Recommendation` y especialmente su `ActionSpec`.

Input mínimo:

```text
recommendation_id
course_section_id
target_actor
mode
priority_band
objective
target_capability_ids
target_cognitive_level
action_type
sequence_pattern
estimated_duration_minutes
context_strategy
evidence_requirement
reason_codes
constraints
```

Inputs pedagógicos adicionales:

```text
capability_statements
concept_ids
curriculum_source_refs
prerequisite_context
error_patterns
contradictions
next_evidence_need
```

Inputs de contexto permitidos:

```text
classroom_context
available_time
available_devices
accessibility_constraints
student_project_context
safe_profile_context
aggregate_class_profile_context
teacher_preferences
```

El Experience Engine no debe recibir información que no necesita.

---

# 6. Output principal: `ExperienceDefinition`

El output canónico es un objeto versionado que describe la experiencia antes de ejecutarla.

```json
{
  "experience_id": "exp_123",
  "experience_version": "1.0.0",
  "course_section_id": "sec_45",
  "recommendation_id": "rec_123",

  "title": "¿Quién debería tomar esta decisión?",
  "description": "Resolvé situaciones ambiguas de un Sprint y decidí qué rol debería intervenir.",

  "delivery_mode": "interactive_web",
  "participation_scope": "individual",
  "estimated_duration_minutes": 10,

  "learning_objective": "Diferenciar Product Owner y Scrum Master en situaciones aplicadas.",
  "target_capabilities": ["CAP-SCRUM-04"],
  "target_cognitive_level": "apply",

  "pedagogical_sequence": [],
  "opportunity_manifest": [],
  "feedback_policy": {},
  "assistance_policy": {},
  "personalization_envelope": {},
  "evidence_contract": {},
  "instrumentation_contract": {},
  "completion_rule": {},

  "runtime_adapter": "web_sandbox_v1",
  "artifact_bundle_id": "bundle_456",
  "status": "ready",
  "created_at": "..."
}
```

Una experiencia no puede pasar a `ready` si no tiene un `evidence_contract` e `instrumentation_contract` válidos cuando pretende generar evidencia académica.

---

# 7. `ExperienceSpec` vs `ExperienceDefinition`

Conviene separar dos objetos.

## 7.1. ExperienceSpec

Es la especificación pedagógica previa a generar la implementación.

Responde:

> **¿Qué experiencia necesitamos?**

Incluye:

- objetivo;
- capacidad;
- nivel cognitivo;
- secuencia;
- oportunidades;
- feedback;
- asistencia;
- restricciones;
- contexto.

## 7.2. ExperienceDefinition

Es la experiencia ejecutable concreta.

Responde:

> **¿Qué exactamente vamos a ejecutar?**

Incluye el spec más:

- versión;
- bundle ejecutable;
- assets;
- runtime adapter;
- contract tests aprobados;
- hash;
- publicación.

Esta separación permite regenerar la interfaz sin perder la intención pedagógica.

---

# 8. Selección del formato

El formato debe elegirse por adecuación pedagógica, no por novedad.

El motor considera:

```text
capacidad
nivel cognitivo
error o necesidad
cantidad de estudiantes
tiempo disponible
dispositivos
contexto físico
necesidad de evidencia individual
complejidad de generación
accesibilidad
```

Principio:

> **Usar el medio mínimo suficiente para provocar el proceso mental deseado.**

Ejemplos:

- distinguir roles → escenario de decisión puede ser mejor que 3D;
- anatomía → modelo 3D puede aportar una affordance real;
- circuitos → simulación interactiva puede superar una explicación textual;
- argumentación → debate + reescritura individual puede ser superior a un juego;
- recuperación de conceptos → preguntas breves pueden ser suficientes.

---

# 9. Matriz capacidad → formato

Guía inicial, no regla rígida:

| Necesidad | Formatos preferentes |
|---|---|
| Reconocer | clasificación, matching, identificación visual |
| Explicar | conversación, explicación escrita, teach-back |
| Aplicar | caso, decisión, cálculo, manipulación |
| Resolver | simulación, caso ambiguo, sistema dinámico |
| Transferir | contexto nuevo, proyecto real, desafío abierto |
| Corregir misconception | contraste, contraejemplo, decisión + feedback |
| Resolver contradicción | probe controlado, dos tareas equivalentes |
| Practicar recuperación | microquiz, flash challenge, explicación breve |
| Crear artefacto | workspace, proyecto, plantilla, editor |

El Experience Engine puede apartarse de la guía si documenta el rationale.

---

# 10. Catálogo de formatos

El catálogo inicial incluye:

```text
conversational_tutor
socratic_dialogue
retrieval_drill
classification
matching
worked_example
contrastive_case
decision_scenario
branching_scenario
interactive_simulation
systems_simulation
virtual_lab
3d_model
interactive_diagram
timeline
map_experience
strategy_game
role_play
peer_instruction
case_discussion
debate
collaborative_problem
artifact_builder
project_challenge
exit_ticket
reflection_retest
mixed_sequence
```

El catálogo debe ser extensible.

No debe convertirse en una lista visible que el docente tenga que entender para usar Educai.

---

# 11. Diseño pedagógico interno

Toda experiencia se diseña con esta secuencia de razonamiento:

```text
1. Objetivo
2. Comportamiento observable
3. Motivación adecuada
4. Problema o misión
5. Mecánica
6. Feedback
7. Segunda oportunidad
8. Evidencia
9. Recuperación / cierre
```

No todos los pasos deben aparecer explícitamente.

El Experience Engine debe evitar llenar una experiencia con dinámicas innecesarias.

---

# 12. Arquitectura pedagógica por defecto

Cuando corresponde, utilizar:

```text
HOOK
↓
MISIÓN / PROBLEMA
↓
PRIMER INTENTO
↓
FEEDBACK O CONTENIDO NECESARIO
↓
APLICACIÓN / SEGUNDO INTENTO
↓
CONSECUENCIA
↓
RECUPERACIÓN
↓
CIERRE
```

Para una experiencia de verificación independiente, el feedback puede demorarse hasta que termine el bloque de oportunidades.

Para una experiencia puramente formativa, el feedback puede ser inmediato.

---

# 13. Motivación

El motor puede utilizar motivaciones humanas cuando sean funcionales al objetivo:

- curiosidad;
- propósito;
- autonomía;
- dominio;
- cooperación;
- incertidumbre;
- reconocimiento;
- competencia ligera;
- pertenencia.

Regla:

> **No seleccionar una mecánica solamente porque aumenta engagement.**

La motivación debe facilitar:

- comenzar;
- sostener esfuerzo;
- pensar;
- decidir;
- recordar.

No debe crear urgencia artificial, FOMO o loops adictivos.

---

# 14. Opportunity Manifest

Toda experiencia que genera evidencia debe declarar sus oportunidades.

Ejemplo:

```json
{
  "opportunity_id": "opp_1",
  "capability_id": "CAP-SCRUM-04",
  "cognitive_demand": "apply",
  "scenario_family": "prioritization",
  "independence_group": "A",
  "expected_behaviors": ["assign_product_owner"],
  "common_errors": ["assign_scrum_master"],
  "feedback_before_next": false,
  "state_eligible": true
}
```

El manifest permite al Runtime y Evidence Engine saber qué acciones constituyen oportunidades reales.

---

# 15. Independencia de oportunidades

Dos interacciones no son independientes solo porque ocurren en pantallas distintas.

La independencia depende de:

- si el escenario exige un razonamiento nuevo;
- si el feedback anterior reveló la regla;
- si las alternativas son equivalentes;
- si el estudiante puede responder por memoria superficial;
- si pertenecen a la misma familia de caso.

El `OpportunityManifest` debe declarar:

```text
independence_group
feedback_contamination_rules
parallel_form_id
```

El Evidence Engine conserva la decisión final de elegibilidad, pero el Runtime debe proveer la información necesaria.

---

# 16. Evidence Contract

El `EvidenceContract` formaliza qué evidencia pretende producir la experiencia.

```json
{
  "target_capability_ids": ["CAP-SCRUM-04"],
  "required_cognitive_level": "apply",
  "required_opportunity_count": 2,
  "minimum_unassisted_opportunities": 1,
  "accepted_performance_types": ["decision"],
  "assistance_constraints": {
    "max_level_for_state_eligibility": "light_prompting"
  },
  "expected_error_taxonomy": [
    "role_assignment_error",
    "prioritization_confusion"
  ],
  "desired_next_evidence_need": "error_retest"
}
```

El contrato no garantiza que la experiencia produzca evidencia suficiente. Declara la intención de observación.

---

# 17. Assistance Policy

Toda ayuda debe ser explícita y registrable.

Niveles compatibles con Evidence Engine:

```text
none
light_prompting
scaffolded
substantial
answer_revealed
```

La experiencia debe mapear cada ayuda a un nivel.

Ejemplo:

```text
Hint 1: "Pensá quién prioriza valor." → light_prompting
Hint 2: "Revisá la diferencia entre facilitar y priorizar." → scaffolded
Hint 3: "El Product Owner prioriza el backlog." → answer_revealed
```

El Runtime no puede emitir una respuesta como `unassisted` si previamente se reveló información determinante.

---

# 18. Feedback Policy

Tipos iniciales:

```text
immediate
post_item
post_batch
end_of_experience
teacher_release
adaptive
```

## 18.1. Immediate

Adecuado para aprendizaje formativo.

## 18.2. Post batch

Adecuado cuando varias oportunidades deben permanecer independientes.

## 18.3. Teacher release

Adecuado para una experiencia sincrónica en aula.

El docente puede revelar explicación a toda la clase cuando decida.

Una vez revelada una respuesta, el Runtime debe marcar oportunidades posteriores afectadas por esa revelación.

---

# 19. Feedback al estudiante

El feedback debe responder prioritariamente:

1. qué ocurrió;
2. por qué;
3. qué conviene cambiar;
4. qué intenta después.

Ejemplo:

> Elegiste que el Scrum Master decidiera la prioridad. Ese rol facilita el proceso, pero la priorización de valor corresponde al Product Owner. Probemos una situación diferente.

Evitar:

> Incorrecto. 0 puntos.

cuando el objetivo es aprendizaje.

---

# 20. Reintentos

Los reintentos deben diferenciar:

```text
same_item_retry
parallel_item_retry
new_opportunity
```

## Same item retry

Sirve para corrección, pero no es una oportunidad independiente.

## Parallel item retry

Mismo constructo, escenario equivalente.

Puede aportar evidencia, dependiendo del feedback previo.

## New opportunity

Escenario nuevo y suficientemente independiente.

Es la opción preferida para verificar aprendizaje después de feedback.

---

# 21. Adaptación dinámica

Una experiencia puede ramificarse según el desempeño.

Ejemplo:

```text
respuesta incorrecta
↓
contraste breve
↓
práctica guiada
↓
nuevo escenario independiente
```

O:

```text
respuesta correcta rápida
↓
caso más ambiguo
↓
transferencia
```

Regla:

> **La adaptación puede cambiar la ayuda, el contexto y la secuencia; no puede cambiar silenciosamente qué capacidad se afirma haber observado.**

Toda rama debe estar instrumentada.

---

# 22. Personalización académica

La personalización puede modificar:

- contexto;
- industria;
- stakeholders;
- rol narrativo;
- dataset;
- ejemplos;
- proyecto aplicado;
- estética temática;
- orden de ejemplos;
- forma de motivar.

No puede modificar:

- capacidad objetivo;
- conceptos obligatorios;
- nivel cognitivo requerido;
- dificultad necesaria;
- criterio de desempeño;
- evidencia requerida;
- reglas de asistencia.

---

# 23. Personalization Envelope

El Runtime no debería recibir el perfil completo del estudiante.

Debe recibir un objeto mínimo:

```json
{
  "allowed_contexts": ["emprendimiento", "producto digital"],
  "preferred_problem_styles": ["decision", "open_problem"],
  "project_context_id": "proj_12",
  "avoid_for_variety": [],
  "accessibility_preferences": {},
  "exploration_mode": true
}
```

No incluir, salvo necesidad explícita y permiso:

- texto completo del onboarding;
- inseguridades personales;
- hipótesis privadas irrelevantes;
- comentarios sensibles;
- datos de otras cátedras.

---

# 24. Equivalence Envelope

Cuando dos estudiantes reciben versiones personalizadas diferentes, la comparabilidad requiere preservar un núcleo equivalente.

`EquivalenceEnvelope`:

```text
target_capability
cognitive_demand
required_reasoning_steps
information_available
assistance_policy
success_criteria
opportunity_count
difficulty_band
```

Ejemplo:

- estudiante A resuelve un caso de startup;
- estudiante B resuelve un caso ambiental.

Ambos pueden aportar evidencia comparable si deben ejecutar el mismo razonamiento y enfrentan una dificultad equivalente.

La personalización narrativa no puede hacer la versión de un estudiante materialmente más fácil.

---

# 25. Uso de proyectos personales

Cuando `context_strategy = project_application`, el Experience Engine puede usar un proyecto global del estudiante.

Debe separar:

```text
PROJECT CONTEXT
información necesaria para plantear la actividad

PROJECT PRIVACY
información que permanece privada
```

El sistema puede pedir:

> Usaremos Educai como contexto para aplicar segmentación. ¿Querés continuar con este proyecto o usar un caso neutral?

El docente no recibe acceso automático al proyecto.

---

# 26. Relevancia + exploración

No todas las experiencias deben personalizarse al contexto favorito del estudiante.

El motor debe alternar entre:

- relevancia;
- contextos neutrales;
- contextos nuevos.

Esto evita que un alumno que siempre elige “startup” solo aprenda a reconocer conceptos cuando están vestidos de startup.

La transferencia requiere variedad contextual.

---

# 27. Scope de participación

Valores:

```text
individual
pair
group
whole_class
```

El scope afecta la evidencia.

## Individual

Puede generar evidencia individual.

## Pair

La producción conjunta no debe atribuirse automáticamente a ambos integrantes como capacidad individual.

## Group

Produce evidencia de grupo o contexto, salvo checkpoint individual.

## Whole class

Produce principalmente señales agregadas.

---

# 28. Captura individual dentro de experiencias grupales

Patrón recomendado:

```text
1. respuesta individual inicial
2. discusión en parejas/grupos
3. respuesta grupal
4. explicación
5. respuesta individual final
```

Esto permite observar:

- estado inicial;
- efecto de interacción;
- aprendizaje posterior;

sin atribuir una respuesta grupal a cada estudiante.

---

# 29. Runtime Session

Cada ejecución crea una `ExperienceSession`.

```json
{
  "session_id": "sess_123",
  "experience_id": "exp_123",
  "experience_version": "1.0.0",
  "student_id": "stu_123",
  "course_section_id": "sec_45",
  "status": "active",
  "started_at": "...",
  "last_activity_at": "...",
  "current_step_id": "step_4",
  "attempt_state": {},
  "assistance_state": {},
  "resume_token": "..."
}
```

El session state debe permitir continuar sin reconstruir el contexto.

---

# 30. Estados de sesión

```text
created
ready
active
paused
completed
abandoned
expired
failed
invalidated
```

`completed` no significa necesariamente que exista evidencia suficiente.

Un estudiante puede completar una experiencia y producir evidencia ambigua o insuficiente.

---

# 31. Pausa y reanudación

Para experiencias individuales:

- autoguardado frecuente;
- persistir step actual;
- persistir intentos;
- persistir ayudas reveladas;
- no resetear asistencia al reanudar;
- mantener versión fija.

Al regresar:

> **Continuar donde quedaste**

Si la experiencia fue invalidada por cambio curricular o docente:

> Esta actividad cambió desde tu última sesión. Te proponemos continuar con la versión actualizada.

No migrar silenciosamente una sesión a otra versión.

---

# 32. Lifecycle de ExperienceDefinition

```text
draft
↓
generating
↓
validating
↓
preview_ready
↓
ready
↓
published
↓
retired
```

Estados de error:

```text
generation_failed
validation_failed
```

Una versión `published` es inmutable.

Editar genera una nueva versión.

---

# 33. Pipeline de generación digital

Para experiencias `interactive_web`:

```text
ExperienceSpec
↓
Planner
↓
UI / interaction design
↓
Code generation (Claude Code / Codex)
↓
Dependency validation
↓
Static analysis
↓
Contract tests
↓
Instrumentation tests
↓
Security sandbox tests
↓
Accessibility / responsive checks
↓
Preview
↓
Teacher approval when required
↓
Publish immutable version
```

El agente de programación puede crear interfaces sofisticadas, pero nunca omite las validaciones.

---

# 34. Generación con Claude Code / Codex

La herramienta concreta de generación no forma parte del contrato de producto.

El sistema debe poder utilizar uno o más agentes de programación.

El agente recibe:

- `ExperienceSpec`;
- SDK del Runtime;
- componentes UI permitidos;
- documentación del event bridge;
- restricciones de seguridad;
- assets permitidos;
- test suite generada desde el spec.

No recibe:

- credenciales de producción;
- acceso directo a DB;
- tokens internos;
- datos individuales irrelevantes.

---

# 35. Experience SDK

Toda experiencia digital debe usar un SDK restringido.

Funciones conceptuales:

```text
session.getContext()
session.saveState()
events.emit()
assistance.requestHint()
feedback.show()
experience.complete()
artifact.submit()
accessibility.getPreferences()
```

No debe poder:

```text
queryDatabaseDirectly()
readOtherStudents()
readOtherCourseSections()
accessSecrets()
arbitraryExternalFetch()
```

El SDK es la única puerta hacia servicios internos necesarios.

---

# 36. Instrumentation Contract

Eventos mínimos de lifecycle:

```text
experience_started
experience_resumed
step_viewed
opportunity_started
response_submitted
decision_made
hint_requested
hint_revealed
feedback_shown
retry_started
variable_changed
artifact_submitted
reflection_submitted
opportunity_completed
experience_completed
experience_abandoned
runtime_error
```

Cada evento incluye como mínimo:

```text
event_id
session_id
experience_id
experience_version
student_id_internal
course_section_id
timestamp
event_type
step_id
opportunity_id
payload_schema_version
```

La vista docente nunca consume `student_id_internal` directamente.

---

# 37. Eventos específicos por formato

## Simulación

```text
simulation_state_changed
variable_changed
constraint_triggered
simulation_outcome
```

## 3D

```text
object_selected
layer_toggled
section_viewed
manipulation_completed
```

Estos eventos solo se convierten en evidencia si el contrato especifica por qué son académicamente informativos.

Rotar un modelo 3D no demuestra aprendizaje por sí solo.

## Conversación

```text
student_message
assistant_message
prompt_requested
student_revision
```

## Artefacto

```text
artifact_created
artifact_saved
artifact_submitted
artifact_revised
```

---

# 38. Event Bridge → Evidence Engine

El Runtime no produce directamente `CapabilityState`.

Flujo:

```text
Runtime Event
↓
Event Normalizer
↓
RawInteraction / Experience Interaction
↓
Evidence Engine
↓
EvidenceEvent
↓
EvidenceSignal
```

El `OpportunityManifest` y `EvidenceContract` acompañan los eventos para permitir interpretación correcta.

---

# 39. Feedback y contamination flags

Cuando se muestra feedback que revela información relevante, el Runtime debe emitir:

```text
feedback_shown
reveals_answer = true/false
reveals_rule = true/false
affected_capability_ids
affected_opportunity_families
```

Esto permite que Evidence Engine determine qué respuestas posteriores están asistidas o contaminadas.

---

# 40. Teacher Launch

Para experiencias de cátedra:

```text
Docente
↓
Usar experiencia
↓
Preview / editar si quiere
↓
Lanzar
↓
QR + código + enlace
↓
Estudiantes ingresan
```

El docente puede seleccionar:

- ahora;
- fecha/hora;
- ventana de disponibilidad;
- individual / pares / grupos;
- feedback inmediato o controlado;
- duración orientativa.

No debería configurar parámetros pedagógicos técnicos por defecto.

---

# 41. Live Teacher View

Durante una experiencia sincrónica, mostrar solamente agregados.

Ejemplo:

```text
36 ingresaron
31 respondieron

Opción A   61%
Opción B   25%
Opción C   14%
```

Puede mostrar:

- ingreso;
- completitud;
- distribución de respuestas;
- distribución por escenario;
- tiempo agregado;
- requests de ayuda agregados.

No mostrar:

- nombre → respuesta;
- ranking;
- estudiante “atrasado”;
- perfil individual;
- errores individuales.

---

# 42. Teacher controls en vivo

Controles permitidos:

```text
start
pause
advance
lock_responses
release_feedback
show_aggregate
end_experience
```

Cuando `release_feedback` revela la regla correcta, se registra para todos los estudiantes afectados.

Si luego se quiere obtener nueva evidencia independiente, el Experience Engine debe utilizar otro escenario.

---

# 43. Experiencias presenciales

Una experiencia `teacher_led` produce:

```text
facilitation_plan
teacher_script
materials
student_instructions
timing
expected_difficulties
capture_plan
closure
```

Ejemplo:

> Debate de 15 minutos sobre quién debe tomar una decisión dentro de un Sprint.

Puede no requerir código complejo.

Pero si se pretende actualizar estados individuales, debe incluir una captura individual.

---

# 44. Capture Plan

El Experience Engine define cómo se producirá evidencia en experiencias no digitales.

Opciones:

```text
pre_response_mobile
post_response_mobile
exit_ticket
individual_reflection
artifact_upload
micro_decision
teacher_observation_context_only
```

Ejemplo:

```text
antes del debate → elección individual
tras debate → elección individual + justificación
```

La discusión grupal es experiencia de aprendizaje.

Las elecciones individuales son oportunidades de evidencia.

---

# 45. Evidencia de actividades grupales

Regla estricta:

> **Una respuesta de grupo no actualiza automáticamente el estado individual de todos sus integrantes.**

Puede producir:

- `group_evidence`;
- señal agregada de aula;
- contexto para Recommendation Engine docente.

Para evidencia individual, agregar checkpoint individual.

---

# 46. Experiencias de artefacto

Un `artifact_based` experience debe declarar:

```text
output_type
required_elements
criteria
capabilities
allowed_tools
submission_format
revision_policy
```

La evaluación debe hacerse contra criterios observables.

No inferir calidad académica por longitud, diseño visual o completitud superficial.

---

# 47. IA dentro de una experiencia

Una experiencia puede incluir un agente conversacional específico.

El agente debe recibir un `TutorPolicy`:

```text
teaching_mode
assessment_mode
allowed_hint_depth
answer_reveal_policy
target_capabilities
forbidden_shortcuts
feedback_timing
```

El mismo agente puede cambiar de modo dentro de una experiencia, pero el cambio se registra.

---

# 48. Teaching mode vs Evidence mode

## Teaching mode

Puede:

- explicar;
- mostrar ejemplos;
- hacer preguntas guiadas;
- dar feedback frecuente;
- adaptar la explicación.

## Evidence mode

Debe:

- evitar revelar respuesta antes del intento;
- limitar ayudas según contract;
- capturar razonamiento cuando corresponda;
- mantener condiciones comparables;
- registrar asistencia.

UI puede decir:

> **Ahora probalo por tu cuenta.**

No es necesario decir “modo evaluación”.

---

# 49. Calidad pedagógica

Cada `ExperienceSpec` recibe un `PedagogicalQualityReview`.

Dimensiones:

```text
alignment
cognitive_demand
clarity
feedback_quality
evidence_validity
motivation_fit
feasibility
accessibility
cognitive_load
```

Cada dimensión:

```text
pass
warn
fail
```

Una falla en `alignment`, `evidence_validity` o `accessibility_critical` bloquea publicación.

---

# 50. Preguntas de control pedagógico

El validador debe preguntar:

- ¿la actividad obliga a usar la capacidad objetivo?
- ¿se puede acertar por pistas superficiales?
- ¿el nivel cognitivo coincide con el requerido?
- ¿la teoría es necesaria para resolver el problema?
- ¿existe feedback útil?
- ¿hay una oportunidad de corrección?
- ¿la evidencia es atribuible al estudiante?
- ¿las ayudas están instrumentadas?
- ¿se está midiendo click behavior en lugar de aprendizaje?
- ¿hay sobrecarga de dinámica?
- ¿el formato agrega valor real?

---

# 51. Calidad técnica

Toda experiencia digital debe pasar:

```text
build
unit tests
runtime contract tests
instrumentation tests
responsive test
accessibility smoke test
security scan
performance budget
crash recovery test
```

Ninguna experiencia generada pasa directo del agente de código al estudiante.

---

# 52. Contract Tests

Generados automáticamente desde `ExperienceSpec`.

Ejemplos:

```text
- experience_started se emite una sola vez por inicio
- cada opportunity_id declarado puede iniciarse y completarse
- response_submitted contiene opportunity_id
- hint_requested modifica assistance_state
- answer reveal marca contamination
- completion solo ocurre tras cumplir completion_rule
- no existen fetches a dominios no permitidos
- no se puede leer otra cátedra
```

---

# 53. Security Sandbox

El código generado debe ejecutarse en un entorno aislado.

Principios:

- sin secretos de producción;
- sin acceso directo a DB;
- sin filesystem persistente arbitrario;
- sin shell disponible al código de la experiencia;
- network egress restringido;
- dependencias allowlisted;
- límites de CPU/memoria/tiempo;
- CSP estricta;
- sanitización de contenido;
- upload scanning;
- eventos únicamente mediante SDK.

---

# 54. Dependencias

Preferir:

- componentes nativos del Runtime;
- librerías aprobadas;
- assets propios/licenciados;
- paquetes con versiones fijadas.

Evitar:

- CDN arbitrarios;
- paquetes de origen desconocido;
- trackers externos;
- embeds con cookies de terceros;
- APIs externas innecesarias.

La allowlist debe ser versionada.

---

# 55. Generación de assets

Una experiencia puede requerir:

- ilustraciones;
- diagramas;
- datasets;
- modelos 3D;
- audio;
- archivos de práctica.

Cada asset debe registrar:

```text
asset_id
origin
license_or_generation_provenance
content_hash
safety_status
accessibility_metadata
```

No depender de un asset externo que pueda desaparecer después de publicar la experiencia.

---

# 56. Accesibilidad

Requisitos base:

- teclado;
- contraste;
- labels;
- estados no dependientes solo de color;
- textos alternativos;
- responsive;
- foco visible;
- captions cuando haya audio;
- reduced motion;
- alternativa a interacciones inaccesibles cuando sea razonable.

Una experiencia 3D o drag-and-drop debe ofrecer una forma alternativa de realizar la acción académicamente equivalente.

---

# 57. Mobile first

La experiencia estudiante debe funcionar en mobile salvo que la capacidad requiera explícitamente otra interfaz.

Si una experiencia necesita desktop:

```text
device_requirement = desktop
```

Recommendation Engine debe conocerlo antes de seleccionarla cuando el estudiante solo tiene celular.

No diseñar una interfaz de escritorio y “achicarla”.

---

# 58. Performance

Budgets iniciales a calibrar:

```text
first_interaction_ready <= 3 s en conexión razonable
resume <= 2 s
interaction latency local <= 100 ms cuando no depende de IA
server acknowledgement <= 1 s objetivo
```

Las experiencias complejas pueden cargar assets progresivamente.

Nunca bloquear el inicio por recursos que todavía no se necesitan.

---

# 59. IA y latencia

Cuando una interacción requiere inferencia:

- mostrar estado de procesamiento explicable;
- conservar input;
- soportar retry;
- evitar doble submit;
- idempotencia;
- timeout;
- fallback cuando corresponda.

No mostrar spinner eterno.

Ejemplo:

> **Estamos comparando tu explicación con los criterios de esta actividad…**

---

# 60. Fallos y fallback

Una experiencia generada puede fallar.

El Runtime debe distinguir:

```text
recoverable_client_error
recoverable_server_error
generation_defect
content_defect
instrumentation_defect
fatal_runtime_error
```

Fallbacks:

1. retry controlado;
2. restaurar session state;
3. versión simple equivalente;
4. pasar a experiencia conversacional equivalente;
5. informar al docente si era una experiencia de aula.

Principio:

> **Un fallo técnico no debe destruir el progreso ni inventar evidencia.**

---

# 61. Fallback pedagógico

Si la experiencia avanzada no puede generarse o validarse a tiempo:

```text
3D / simulación compleja
↓
scenario interactivo
↓
caso conversacional estructurado
```

Preservar:

- capacidad;
- demanda cognitiva;
- evidencia requerida.

No preservar necesariamente la espectacularidad.

---

# 62. Preview docente

Antes de lanzar una experiencia docente generada, mostrar:

> **Objetivo**  
> Qué van a hacer  
> Duración  
> Qué necesitás en el aula  
> Qué observará Educai

Acciones:

```text
Usar experiencia
Editar
Ver como estudiante
Generar otra alternativa
```

No mostrar el JSON técnico por defecto.

---

# 63. Edición docente

El docente puede pedir cambios en lenguaje natural:

> “Hacela en 15 minutos.”

> “No tengo notebooks, solo celulares.”

> “Quiero que primero discutan de a dos.”

> “Usá un caso de una empresa industrial.”

El Experience Engine regenera el spec.

Si el cambio altera:

- capacidad;
- dificultad;
- evidencia;
- independencia;

requiere revalidación completa.

---

# 64. Publicación y versionado

Una versión publicada es inmutable.

```text
exp_123 v1.0.0
↓ edición
exp_123 v1.1.0
```

Cada `ExperienceSession` queda anclada a una versión.

El Evidence Engine registra esa versión junto con la evidencia.

Esto permite auditoría y reproducibilidad.

---

# 65. Version semantics

Propuesta:

```text
PATCH
cambio visual/técnico sin alterar comportamiento académico

MINOR
cambio de contenido o flujo que preserva capability/evidence contract

MAJOR
cambio de capability, cognitive demand o evidence contract
```

Una nueva versión mayor puede requerir nueva validación curricular.

---

# 66. Cátedra isolation

Todo `ExperienceDefinition` pertenece a:

```text
course_section_id
```

No existe reutilización pedagógica automática entre cátedras.

El código base del Runtime, componentes y patrones pueden ser compartidos como infraestructura, pero:

- contenido;
- configuración;
- evidencia;
- sesiones;
- datos del aula;

permanecen aislados.

---

# 67. Templates vs generación custom

Educai puede usar componentes reutilizables internamente, pero no debe limitarse a “templates con texto cambiado”.

Tres niveles:

```text
Level 1 — composed
componentes existentes

Level 2 — generated interaction
lógica y UI específica generada

Level 3 — custom simulation
aplicación especializada con lógica propia
```

El motor elige el nivel mínimo que logra el objetivo con calidad.

Claude Code/Codex se utilizan especialmente para Level 2 y Level 3.

---

# 68. Caching y regeneración

Se puede cachear:

- builds;
- assets;
- componentes;
- validaciones técnicas;

No se debe cachear una experiencia personalizada y entregarla a otro estudiante si contiene contexto privado.

Los bundles genéricos pueden compartirse técnicamente dentro de una cátedra si son exactamente la misma versión.

---

# 69. Privacidad

El Runtime aplica minimización de datos.

No almacena dentro del bundle ejecutable:

- nombre completo;
- perfil profesional completo;
- conversación completa innecesaria;
- estados académicos de terceros;
- comentarios privados;
- identificadores institucionales visibles.

Los IDs internos deben resolverse server-side.

---

# 70. Anonimato en aula

El runtime puede conocer internamente la sesión de cada estudiante para producir evidencia individual.

La interfaz docente recibe un stream agregado.

```text
student session events
↓
aggregation layer
↓
teacher live view
```

No existe endpoint docente de live responses identificado por alumno en v1.

---

# 71. Perfil profesional y experiencias

Al terminar una experiencia puede aparecer una microinteracción opcional:

> **¿Cómo te resultó asumir este tipo de responsabilidad?**

Respuestas:

- Me gustó mucho
- Me interesó
- Neutral
- No me gustó

Este dato:

```text
profile_signal
```

No es:

```text
academic_evidence
```

La separación debe existir a nivel de eventos y almacenamiento.

---

# 72. Cierre de experiencia

Al finalizar, el estudiante recibe una síntesis progresiva:

```text
Terminaste
↓
Qué fortaleciste
↓
Qué conviene revisar
↓
Qué puede venir después
```

La interpretación definitiva puede requerir procesamiento posterior.

Si todavía no hay suficiente evidencia:

> **Ya tenemos una señal útil, pero todavía necesitamos verte aplicar esto en otra situación.**

No inventar una conclusión para llenar la pantalla.

---

# 73. Completion Rule

Una experiencia declara cuándo se considera completada.

Ejemplo:

```json
{
  "type": "all_required_steps",
  "required_step_ids": ["s1", "s2", "s4"],
  "minimum_opportunities_attempted": 3,
  "artifact_required": false
}
```

`completed` no requiere acertar.

Nunca impedir terminar únicamente porque el estudiante responde mal.

---

# 74. Resultado de ExperienceSession

Al cerrar una sesión:

```json
{
  "session_id": "sess_123",
  "status": "completed",
  "completion_reason": "user_completed",
  "duration_seconds": 614,
  "opportunities_attempted": 4,
  "hints_used": 1,
  "artifact_ids": [],
  "event_stream_complete": true,
  "evidence_processing_status": "queued"
}
```

Esto es metadata de ejecución, no interpretación académica.

---

# 75. Experience → Interpretation loop

Después de completar:

```text
Runtime events
↓
Evidence Engine
↓
EvidenceSignals
↓
Interpretation Engine
↓
CapabilityInterpretation
↓
Recommendation Engine
↓
new recommendation
```

La nueva recomendación puede aparecer inmediatamente si el procesamiento es suficientemente rápido.

---

# 76. Teacher outcome

Después de una experiencia de aula, el docente puede ver:

> **Qué observamos**

> 44% de estudiantes con evidencia suficiente todavía confunde responsabilidades en escenarios de impedimentos.

> **Qué cambió**

> La confusión bajó después del segundo escenario.

Solo si el Interpretation Engine respalda esos agregados.

No convertir métricas runtime crudas en conclusiones pedagógicas.

---

# 77. Experience Effectiveness

El sistema debe registrar:

```text
experience_id
experience_version
recommendation_intent
capabilities
pre_interpretation
post_interpretation
follow_up_interpretation
```

Esto permite analizar a largo plazo:

> ¿Qué tipos de experiencias suelen asociarse con mejores progresiones para determinada necesidad?

No atribuir causalidad automáticamente.

---

# 78. Métricas del Experience Engine

Métricas de funcionamiento:

- Generation Success Rate
- Validation Pass Rate
- Time to Preview
- Time to Ready
- Runtime Error Rate
- Resume Success Rate
- Event Completeness Rate
- Instrumentation Validity Rate
- Accessibility Pass Rate
- Teacher Edit Rate
- Teacher Launch Rate
- Student Start Rate
- Completion Rate

Métricas pedagógicas de producto:

- Evidence Yield
- Independent Evidence Yield
- Recommendation → Experience Start Rate
- Experience → Closed Learning Loop Rate
- Error Retest Success Rate
- Transfer Opportunity Completion
- Teacher usefulness rating
- Student usefulness rating

No usar `time spent` como métrica de calidad pedagógica por sí sola.

---

# 79. Evidence Yield

Definición inicial:

```text
sesiones completadas que producen al menos una EvidenceSignal state-eligible
÷
sesiones completadas que pretendían producir evidencia
```

`Independent Evidence Yield` exige además al menos una oportunidad independiente elegible.

Si una experiencia tiene alto completion pero bajo evidence yield, existe un problema de instrumentación o diseño pedagógico.

---

# 80. Quality feedback loop

```text
Recommendation
↓
ExperienceSpec
↓
Experience
↓
Runtime
↓
Evidence
↓
Interpretation change
↓
Effectiveness analytics
↓
mejor selección/diseño futuro
```

En v1, el aprendizaje de política es analítico y supervisado.

No utilizar reinforcement learning autónomo sobre estudiantes.

---

# 81. Observabilidad técnica

Registrar:

- build logs;
- validation results;
- runtime errors;
- SDK errors;
- event lag;
- AI latency;
- cost by generation;
- cost by session;
- bundle size;
- crash traces;
- version IDs.

Separar logs técnicos de contenido académico sensible.

---

# 82. Auditabilidad

Para cualquier EvidenceSignal originada en una experiencia debe poder reconstruirse:

```text
Recommendation
↓
ExperienceSpec
↓
ExperienceDefinition + version
↓
Session
↓
Opportunity
↓
Interaction events
↓
EvidenceEvent
↓
EvidenceSignal
```

Esta trazabilidad es obligatoria.

---

# 83. Determinístico vs IA

## Reglas determinísticas / código

Deben controlar:

- estados de lifecycle;
- versionado;
- permisos;
- event schemas;
- completion rules;
- assistance bookkeeping;
- contamination flags;
- cátedra isolation;
- sandbox restrictions;
- contract tests;
- release gates.

## IA

Puede:

- diseñar la narrativa;
- generar casos;
- proponer mecánicas;
- crear código;
- adaptar contexto;
- redactar feedback;
- generar escenarios paralelos;
- construir assets;
- revisar calidad semántica.

La IA no puede saltarse los contracts.

---

# 84. Experience Planner

Componente lógico del Experience Engine.

Input:

```text
Recommendation
Curriculum context
Constraints
PersonalizationEnvelope
```

Output:

```text
ExperienceSpec
```

Pipeline conceptual:

```text
interpret recommendation intent
↓
select pedagogical pattern
↓
select delivery mode
↓
define opportunities
↓
define feedback/assistance
↓
define personalization bounds
↓
define evidence contract
↓
define instrumentation
↓
quality review
```

---

# 85. Generator

Input:

```text
ExperienceSpec
```

Output:

```text
ExecutableArtifactBundle
```

Según adapter puede producir:

- prompt/config del tutor;
- web app;
- facilitation plan;
- printable assets;
- project workspace;
- combinación de ellos.

---

# 86. Validator

Debe validar tres capas:

```text
PEDAGÓGICA
¿sirve para lo que queremos aprender?

EVIDENCIA
¿produce señales interpretables sin contaminación?

TÉCNICA
¿corre de forma segura y estable?
```

Las tres deben aprobar.

---

# 87. Runtime Orchestrator

Responsabilidades:

- crear sesión;
- entregar bundle;
- recuperar contexto mínimo;
- persistir estado;
- emitir eventos;
- gestionar ayudas;
- gestionar feedback;
- manejar concurrencia;
- finalizar;
- encolar procesamiento de evidencia.

No realiza la interpretación académica.

---

# 88. Runtime adapters

Interfaz conceptual:

```text
initialize(session_context)
start()
resume()
handleInteraction()
requestAssistance()
releaseFeedback()
saveState()
complete()
terminate()
```

Adapters v1:

```text
chat_runtime
web_sandbox_runtime
teacher_led_runtime
artifact_runtime
hybrid_runtime
```

---

# 89. Teacher-led runtime

Aunque no haya una “app” principal, existe runtime lógico.

Debe:

- mostrar instrucciones al docente;
- controlar tiempos opcionales;
- abrir checkpoints digitales;
- capturar respuestas;
- permitir release de feedback;
- cerrar actividad;
- asociar capturas al mismo `ExperienceRun`.

---

# 90. Hybrid runtime

Ejemplo:

```text
STEP 1 mobile individual
↓
STEP 2 discusión presencial
↓
STEP 3 teacher releases aggregate
↓
STEP 4 mobile individual
↓
STEP 5 feedback
```

El Runtime sincroniza fases, pero las interacciones sociales ocurren fuera del dispositivo.

---

# 91. Preservación de evidencia al editar

Si el docente edita solamente:

- nombre;
- copy;
- contexto narrativo;
- duración estimada;

puede conservar el EvidenceContract si la equivalencia es validada.

Si edita:

- respuestas correctas;
- criterios;
- dificultad;
- cantidad de oportunidades;
- hints;
- orden de feedback;

revalidar evidencia.

---

# 92. Student autonomy

El estudiante puede, cuando la Recommendation lo permite:

```text
Empezar
Quiero otra forma de trabajarlo
Usar otro contexto
Usar un proyecto
Hacerlo sin pistas
```

El Experience Engine genera una variante dentro de los límites del `EquivalenceEnvelope`.

No habilitar opciones que invaliden un requisito docente obligatorio.

---

# 93. “Quiero entender mejor / practicar / probarme / profundizar”

Estas intenciones pueden mapear a políticas del Experience Engine:

```text
Entender mejor → teaching-heavy
Practicar → repeated application with feedback
Probarme → evidence-heavy, low assistance
Profundizar → ambiguity / higher complexity / transfer
```

La selección manual del estudiante es un input al Recommendation Engine o variante de experiencia, no una modificación silenciosa del estado académico.

---

# 94. Experiencias generadas para estudiante autónomo

Una recomendación individual puede disparar generación on-demand.

No requiere aprobación docente individual si:

- usa currícula validada;
- no modifica criterios oficiales;
- pasa quality gates automáticos;
- no se utiliza como evaluación formal;
- respeta políticas de cátedra.

La institución/docente puede configurar:

```text
autonomous_generation_allowed = true/false
```

---

# 95. Experiencias docentes

Toda experiencia que se lanza a una clase completa debe ser visible al docente antes de publicación.

Default v1:

> **Teacher approval required.**

El objetivo no es obligarlo a auditar código, sino permitirle validar:

- pertinencia;
- tiempo;
- tono;
- viabilidad;
- contenido.

---

# 96. Evaluación formal

Experience Engine v1 está optimizado para aprendizaje formativo.

No asumir automáticamente validez para:

- parciales formales;
- calificaciones oficiales;
- certificaciones;
- high-stakes assessment.

Si una institución quiere utilizarlo para evaluación formal, requiere un modo y validación específicos fuera del alcance v1.

---

# 97. Integridad académica

No se necesita un sistema de vigilancia.

En experiencias de evidencia formativa:

- registrar asistencia;
- diseñar oportunidades nuevas;
- valorar razonamiento;
- usar variantes paralelas;
- no convertir el resultado en nota oficial.

Evitar proctoring invasivo.

---

# 98. Data retention

Separar:

```text
runtime_state
interaction_events
academic_evidence
technical_logs
artifacts
```

Los períodos de retención exactos se definen en política de privacidad.

Si una fuente es eliminada y sus eventos son necesarios únicamente para esa fuente, aplicar el flujo de invalidación del Evidence Engine.

---

# 99. Idempotencia

Eventos críticos deben usar `event_id` único.

Reintentar una request no puede producir:

- dos respuestas registradas;
- dos completion;
- dos EvidenceEvents equivalentes.

El Event Bridge deduplica.

---

# 100. Offline / conectividad débil

En mobile, cuando sea razonable:

- cachear bundle;
- guardar respuestas localmente;
- encolar eventos;
- sincronizar al recuperar conexión.

Si no puede garantizarse la integridad de una experiencia que depende de servidor/IA, informar antes de comenzar.

---

# 101. Concurrencia de aula

El Runtime debe soportar una cátedra completa iniciando simultáneamente.

Requisitos:

- join rápido;
- session creation idempotente;
- broadcast de fases;
- aggregate stream desacoplado;
- backpressure;
- graceful degradation.

El live dashboard no debe bloquear la interacción del estudiante.

---

# 102. Group formation

En v1, Educai no necesita asignar grupos algorítmicamente según perfiles individuales.

El docente puede:

- dejar libre;
- indicar cantidad de personas;
- asignar manualmente fuera del sistema.

Evitar revelar o usar perfiles individuales para formar grupos sin una política específica.

---

# 103. 3D y simulaciones avanzadas

Usar cuando la manipulación representa una variable pedagógicamente importante.

Ejemplos válidos:

- anatomía;
- estructuras;
- mecánica;
- circuitos;
- procesos físicos;
- sistemas espaciales;
- entornos técnicos.

Evitar 3D decorativo para conceptos donde no agrega capacidad representacional.

Toda simulación debe distinguir:

```text
state variables
student controls
system rules
observables
outcomes
```

---

# 104. Simulaciones de decisión

Para disciplinas de negocio, innovación, gestión y ciencias sociales, una simulación puede modelar:

```text
context
resources
constraints
stakeholders
choices
consequences
new information
```

Ejemplo Scrum:

> cambia una prioridad → aparece un impedimento → stakeholder presiona → el estudiante decide quién interviene y cómo.

La consecuencia debe enseñar, no solamente asignar puntos.

---

# 105. Sistema causa-efecto

Una experiencia puede permitir modificar variables y observar consecuencias.

La evidencia no es “movió slider”.

Debe existir una tarea:

> Ajustá las variables para alcanzar X y explicá por qué tu solución funciona.

Esto permite observar razonamiento, no solo exploración.

---

# 106. Content grounding

Toda experiencia curricular se genera usando:

- currícula validada;
- materiales aprobados de la cátedra;
- fuentes permitidas;
- criterios del docente cuando existan.

La generación no debe introducir afirmaciones contradictorias con el material de la cátedra sin marcar la discrepancia.

Si falta información:

> generar una experiencia neutral basada únicamente en contenido validado o pedir confirmación docente.

---

# 107. Hallucination control

Para contenido factual:

- source refs en ExperienceSpec;
- retrieval de fragmentos relevantes;
- generación grounded;
- semantic validation contra fuentes;
- teacher preview en experiencias de clase.

Para escenarios ficticios:

- distinguir hechos curriculares de datos narrativos inventados.

---

# 108. Experience rationale

Toda experiencia conserva internamente:

```text
why_this_format
why_this_sequence
why_these_opportunities
why_this_feedback_policy
```

Puede mostrarse al docente mediante:

> **¿Por qué esta experiencia?**

Respuesta breve y pedagógica.

---

# 109. UX estudiante

Pantalla inicial:

```text
¿Quién debería tomar esta decisión?

Vas a resolver 6 situaciones de un Sprint.
10 min

[Empezar]
```

Durante:

- una decisión principal por pantalla cuando sea razonable;
- progreso de experiencia, no porcentaje de conocimiento;
- ayudas disponibles sin esconder su efecto;
- feedback legible;
- pausa cuando el formato lo permite.

Final:

```text
Terminaste

Fortaleciste...
Conviene revisar...

[Seguir]
[Intentar de nuevo]
[Ver detalle]
```

---

# 110. UX docente

Desde el hallazgo:

```text
44% necesita revisar Roles de Scrum
↓
Experiencia recomendada
"¿Quién debería tomar esta decisión?"
15 min · celulares · individual + discusión

[Usar experiencia]
[Ver como estudiante]
[Editar]
```

Al usar:

```text
[Lanzar ahora]
[Programar]
```

Durante:

> 31/42 respondieron.

Después:

> **Ver qué observamos**

---

# 111. Schemas mínimos

## ExperienceSpec

```text
experience_spec_id
recommendation_id
course_section_id
objective
target_capability_ids
target_cognitive_level
delivery_mode
participation_scope
pedagogical_pattern
sequence
opportunity_manifest
feedback_policy
assistance_policy
evidence_contract
personalization_envelope
equivalence_envelope
constraints
source_refs
planner_version
```

## ExperienceDefinition

```text
experience_id
experience_spec_id
version
runtime_adapter
artifact_bundle_id
instrumentation_contract
completion_rule
quality_review
build_hash
status
created_at
published_at
```

## ExperienceSession

```text
session_id
experience_id
experience_version
student_id
course_section_id
status
current_step
state
assistance_state
started_at
last_activity_at
completed_at
```

---

# 112. `ExecutableArtifactBundle`

Puede contener:

```text
web_build
runtime_config
prompt_bundle
assets
printables
teacher_materials
student_materials
test_manifest
```

Cada archivo tiene hash.

El bundle publicado es inmutable.

---

# 113. Experience Quality Score

No mostrar un score único al usuario.

Internamente se puede usar un gate multidimensional.

Ejemplo:

```text
alignment = pass
evidence_validity = pass
technical = pass
accessibility = pass
feasibility = warn
```

Una suma numérica podría ocultar una falla crítica.

Usar gates, no promedio.

---

# 114. Pre-launch checklist docente

Mostrar solo cuando sea útil:

```text
Necesitás:
✓ celulares
✓ 15 minutos
✓ proyector opcional

La experiencia incluye:
✓ respuesta individual
✓ discusión
✓ segundo intento
```

La complejidad técnica permanece invisible.

---

# 115. Instrumentation completeness

Antes de publicar, el test runner debe simular:

- happy path;
- error path;
- hint path;
- retry path;
- abandonment;
- resume;
- feedback reveal.

Confirmar que todos producen eventos coherentes.

---

# 116. Experience invalidation

Una experiencia puede invalidarse si:

- cambia una capacidad curricular;
- el material fuente es retirado;
- se detecta un error de contenido;
- se detecta una vulnerabilidad;
- el evidence contract era incorrecto.

Nueva sesión:

> no usar versión invalidada.

Sesiones ya completadas:

> conservar historial, pero marcar evidencia afectada para revisión/reprocesamiento cuando corresponda.

---

# 117. Reprocessing

Si cambia únicamente Interpretation Engine:

> no es necesario volver a ejecutar la experiencia.

Los eventos y EvidenceSignals pueden reprocesarse.

Si se descubre que una Opportunity estaba mal instrumentada:

> invalidar las señales afectadas y recalcular.

Esto justifica conservar lineage completo.

---

# 118. Teacher-created idea → experience

El docente puede escribir:

> “Quiero llevarlos a visitar una empresa.”

El Experience Engine ayuda a convertirlo en:

```text
objetivo curricular
preparación previa
misión
preguntas de observación
roles
capture plan
reflexión posterior
evidencia individual
```

El motor no necesita que toda experiencia nazca de una recomendación automática.

En ese caso se crea una `TeacherInitiatedExperienceSpec` alineada a currícula antes de generar.

---

# 119. Asistente docente → Experience Engine

Cuando el docente pide:

> “Creame una simulación de esto.”

El asistente no genera directamente un HTML suelto.

Debe:

```text
interpretar pedido
↓
crear/confirmar objetivo y capabilities
↓
crear ExperienceSpec
↓
Experience Engine
↓
validación
↓
preview
```

Así toda experiencia comparte la misma arquitectura.

---

# 120. Student intent → Experience Engine

Cuando el estudiante selecciona:

> **Quiero practicar**

el sistema debe resolver primero:

```text
qué capability activa
qué práctica corresponde
qué asistencia permitir
qué evidencia hace falta
```

Recommendation Engine produce/ajusta el ActionSpec.

Después Experience Engine materializa.

No saltar directamente a “generar quiz”.

---

# 121. Experimentación de formato

Educai puede comparar formatos, pero debe preservar el objetivo.

Ejemplo:

```text
cohorte A → escenario de decisión
cohorte B → conversación estructurada
```

Solo para investigación/product improvement apropiada y respetando políticas institucionales.

No sacrificar a un grupo con una experiencia deliberadamente inferior.

---

# 122. Métricas de aprendizaje y runtime

No confundir:

```text
completion rate
```

con:

```text
learning progression
```

Una experiencia puede tener 95% completion y producir poca evidencia útil.

Otra puede tener alta evidencia sin generar progresión inmediata porque reveló una dificultad real.

Ambas observaciones son informativas.

---

# 123. Cost controls

Las experiencias generadas pueden ser costosas.

Registrar:

- generación de código;
- generación de assets;
- inferencia runtime;
- storage;
- bandwidth.

El Experience Planner debe elegir complejidad proporcional al valor pedagógico.

No usar una simulación custom de alto costo para una práctica que puede resolverse con una interacción simple.

---

# 124. Latency budget de generación

Clases de generación:

```text
instant
< 10 s

short
10–60 s

complex
1–5 min
```

Una simulación custom puede ser asíncrona.

UI:

> **Estamos construyendo y probando la simulación. Podés seguir preparando la clase mientras tanto.**

La generación no debe bloquear toda la interfaz docente.

---

# 125. Draft mientras genera

Mientras se construye una experiencia compleja, mostrar:

- objetivo;
- secuencia propuesta;
- duración;
- requisitos;
- estado de generación.

Permitir cancelar o editar el spec antes de publicar.

---

# 126. Human-in-the-loop

El docente conserva autoridad sobre experiencias de aula.

Puede:

- aceptar;
- editar;
- rechazar;
- pedir otra alternativa;
- informar que no funcionó.

Ese feedback se registra para mejorar selección y generación futura.

No modifica automáticamente estados académicos.

---

# 127. `ExperienceFeedback`

Después de utilizar una experiencia, el docente puede marcar opcionalmente:

```text
Funcionó bien
Funcionó parcialmente
No funcionó
```

Y causas:

```text
time
complexity
student_engagement
content_fit
technical_issue
instructions
other
```

Esto alimenta quality analytics.

---

# 128. Student experience feedback

Separar:

```text
pedagogical usefulness
interest / enjoyment
technical usability
```

No inferir aprendizaje desde satisfacción.

Un estudiante puede no disfrutar una experiencia y aprender mucho.

---

# 129. Data model adicional

## ExperienceRecommendationLink

```text
recommendation_id
experience_spec_id
selected_strategy
selection_rationale
```

## ExperienceQualityReview

```text
experience_definition_id
pedagogical_results
technical_results
security_results
accessibility_results
review_version
```

## OpportunityDefinition

```text
opportunity_id
experience_spec_id
capability_id
cognitive_demand
independence_group
expected_behaviors
common_errors
feedback_contamination_rules
```

## RuntimeEvent

```text
event_id
session_id
experience_id
experience_version
event_type
step_id
opportunity_id
payload
timestamp
schema_version
```

---

# 130. APIs conceptuales

No prescribe REST/GraphQL, pero el dominio necesita operaciones equivalentes:

```text
createExperienceSpec(recommendation)
generateExperience(spec)
validateExperience(definition)
previewExperience(definition)
publishExperience(definition)
launchExperience(experience, launchConfig)
joinExperience(code)
startSession()
resumeSession()
emitRuntimeEvent()
requestHint()
releaseFeedback()
completeSession()
getTeacherAggregate(run)
```

---

# 131. Launch Config

```json
{
  "experience_id": "exp_123",
  "mode": "synchronous",
  "starts_at": "now",
  "ends_at": null,
  "participation_scope": "individual",
  "feedback_release": "teacher_controlled",
  "join_method": ["qr", "code", "link"]
}
```

Para asíncrono:

```text
availability_start
availability_end
resume_allowed
attempt_limit
```

---

# 132. Attempt limits

Default formativo:

> reintentos permitidos.

Pero diferenciar:

- reintento de aprendizaje;
- nueva oportunidad de evidencia.

No limitar intentos para preservar un “score” salvo necesidad pedagógica explícita.

---

# 133. Scores y puntos

Evitar score genérico si no representa un criterio real.

No mostrar:

> 850 XP

como señal académica.

Puede existir puntuación dentro de una simulación si representa una variable del sistema, por ejemplo:

- presupuesto;
- tiempo;
- satisfacción de stakeholders;

pero no debe confundirse con estado de aprendizaje.

---

# 134. Gamificación

Puede utilizar:

- misión;
- progreso de experiencia;
- consecuencias;
- niveles de dificultad;
- desafío;

Evitar:

- streaks compulsivos;
- loot boxes;
- rankings públicos;
- pérdida artificial;
- FOMO.

La motivación debe servir al aprendizaje.

---

# 135. Teacher display después de lanzar

No mostrar solo:

> 31/42 completaron.

Mostrar progresivamente:

```text
Participación
↓
Qué respuestas aparecieron
↓
Qué interpreta Educai cuando hay evidencia suficiente
↓
Qué conviene hacer después
```

Runtime metrics y learning interpretation deben aparecer claramente separadas.

---

# 136. Student display después de completar

La experiencia puede cerrar antes de que Interpretation Engine termine.

Estado provisional:

> **Estamos incorporando esta actividad a tu mapa de aprendizaje.**

Luego actualizar:

> **Ahora tenemos evidencia nueva sobre X.**

Evitar bloquear la experiencia final esperando procesamiento pesado.

---

# 137. Async processing

Después de `experience_completed`:

```text
queue evidence processing
↓
Evidence Engine
↓
Interpretation Engine
↓
Recommendation Engine
```

La UI puede recibir actualización por polling, websocket o mecanismo equivalente.

La implementación concreta se define en Technical Architecture.

---

# 138. Criterios de aceptación

Experience Engine / Runtime v1 está listo cuando puede demostrar que:

1. una Recommendation válida puede convertirse en ExperienceSpec;
2. el ExperienceSpec declara capabilities, cognitive demand y evidence contract;
3. puede producir al menos los cinco adapters v1;
4. una experiencia digital generada pasa quality gates antes de publicar;
5. el código generado no accede directamente a DB o secretos;
6. una sesión puede iniciarse, pausarse y reanudarse conservando ayudas e intentos;
7. todos los eventos críticos incluyen opportunity_id cuando corresponde;
8. un hint cambia correctamente assistance state;
9. una respuesta revelada marca contaminación;
10. un reintento del mismo item no se trata como oportunidad independiente;
11. experiencias grupales no actualizan estados individuales sin captura individual;
12. teacher live view es agregada y anónima;
13. el docente puede lanzar mediante QR/código/enlace;
14. el docente puede controlar feedback en modo sincrónico;
15. la experiencia se puede completar aunque existan respuestas incorrectas;
16. completion no genera automáticamente CapabilityState;
17. los RuntimeEvents pueden transformarse en inputs del Evidence Engine;
18. cada ExperienceSession queda fijada a una versión;
19. editar una versión publicada crea una nueva versión;
20. invalidar una experiencia impide nuevas sesiones;
21. un fallo técnico no genera evidencia falsa;
22. existe fallback pedagógico cuando la experiencia compleja falla;
23. personalización preserva EquivalenceEnvelope;
24. profile signals y academic evidence se guardan separados;
25. una experiencia autónoma puede ejecutarse sin aprobación docente cuando la política lo permite y pasa gates;
26. una experiencia de aula requiere preview/aprobación docente en v1;
27. el sistema mantiene lineage completo hasta EvidenceSignal;
28. los agregados docentes nunca exponen identidad;
29. una experiencia con 3D o simulación avanzada tiene alternativa accesible cuando corresponde;
30. la misma versión + mismo input estructural produce un contract equivalente aunque la narrativa pueda variar dentro de los límites permitidos.

---

# 139. Hipótesis a calibrar en piloto

No tratar como cerrados:

- `resume_window = 72h` heredado de Recommendation Engine;
- duración recomendada de microexperiencias;
- cantidad óptima de oportunidades por experiencia;
- thresholds de performance técnica;
- cuándo usar generación custom vs componentes;
- nivel de teacher approval necesario por formato;
- proporción ideal de feedback inmediato vs post-batch;
- cantidad de personalización contextual;
- cuándo el alumno prefiere experiencia digital vs conversacional;
- cuánto valor agregado aportan simulaciones custom;
- formatos más efectivos por error/capacidad;
- costo máximo razonable por generación;
- usefulness thresholds para retirar formatos de bajo desempeño.

Todos deben ser configurables o instrumentados.

---

# 140. Dataset de evaluación

Construir un set de specs esperados con casos como:

```text
- misconception confirmada
- falta de evidencia independiente
- necesidad de transferencia
- contradicción explicación/aplicación
- parcial cercano
- estudiante con proyecto relevante
- estudiante sin proyecto
- mobile only
- aula sin dispositivos
- experiencia individual
- experiencia grupal
- 3D apropiado
- 3D innecesario
- feedback que contaminaría oportunidades
- hint profundo
- sesión interrumpida
- runtime failure
- docente edita dificultad
```

Para cada caso definir:

```text
expected_delivery_mode
expected_pedagogical_pattern
expected_opportunity_count_range
expected_feedback_policy
expected_assistance_policy
expected_evidence_contract
expected_privacy_behavior
```

Las nuevas versiones del motor se testean contra este set.

---

# 141. Ejemplo end-to-end A — estudiante

Interpretation Engine:

```text
CAP-SCRUM-04
maturity = developing
attention = review
error = PO vs SM en impedimentos
```

Recommendation Engine:

```text
mode = remediate
action_type = error_focused_practice
target_level = apply
sequence = contrast_then_independent_retest
```

Experience Engine:

```text
formato = branching decision scenario
6 situaciones
2 centradas en impedimentos
feedback post-batch inicial
mini explicación
2 escenarios nuevos
```

Runtime:

```text
opp_1 challenge
opp_2 challenge
↓
feedback
↓
guided contrast
↓
opp_3 independent retest
opp_4 independent retest
```

Evidence Engine recibe:

- decisiones iniciales;
- asistencia;
- feedback reveal;
- nuevos intentos independientes.

Interpretation Engine recalcula.

Recommendation Engine genera siguiente paso.

---

# 142. Ejemplo end-to-end B — docente

Hallazgo agregado:

> 44% de estudiantes con evidencia suficiente necesita revisar Product Owner vs Scrum Master.

Recommendation:

```text
teaching_intervention
strategy = peer_instruction + decision_scenario
15 min
```

ExperienceSpec:

```text
1. decisión individual móvil
2. mostrar distribución anónima
3. discusión por parejas
4. nueva decisión individual
5. explicación docente
6. exit scenario nuevo
```

Runtime:

- captura pre;
- agrupa;
- teacher releases distribution;
- captura post;
- registra explicación;
- captura exit.

Docente ve agregados.

Evidence Engine actualiza individualmente solo respuestas individuales.

---

# 143. Ejemplo end-to-end C — proyecto

Interpretación:

> Segmentación: evidencia sólida conceptual; falta transferencia.

Recommendation:

> Aplicar segmentación a un proyecto real.

PersonalizationEnvelope:

```text
project = Educai
allowed_context = proyecto propio
```

Experience:

> Definí tres segmentos posibles para Educai, elegí uno, justificá la prioridad y explicá qué evidencia todavía necesitarías.

El proyecto da contexto.

La capacidad y criterios siguen siendo curriculares.

---

# 144. Ejemplo end-to-end D — 3D

Capacidad:

> Identificar relaciones espaciales entre estructuras anatómicas y predecir qué cambia al alterar una de ellas.

Recommendation:

> aplicación espacial.

Experience Engine determina que 3D aporta valor.

Experiencia:

- modelo rotatable;
- capas;
- corte;
- selección;
- pregunta de predicción;
- manipulación;
- nuevo escenario.

Evidencia:

> selección correcta + explicación/predicción.

No:

> cantidad de rotaciones del modelo.

---

# 145. Ejemplo end-to-end E — fallo

Docente pide simulación compleja para la clase en 10 minutos.

Generación Level 3 falla contract test.

Sistema:

```text
validation_failed
↓
no publica bundle defectuoso
↓
genera fallback Level 2
↓
escenario de decisiones interactivo
↓
preserva capability/evidence contract
```

Docente recibe:

> **La simulación avanzada no pasó nuestras verificaciones. Preparamos una alternativa lista para usar con el mismo objetivo.**

Nunca lanzar código defectuoso por cumplir deadline.

---

# 146. Roadmap técnico recomendado

## Fase 1 — Runtime contract

Construir primero:

- ExperienceSpec schema;
- OpportunityManifest;
- EvidenceContract;
- RuntimeEvent schema;
- ExperienceSession;
- event bridge;
- versioning.

## Fase 2 — Adapters simples

- chat runtime;
- structured web runtime;
- teacher-led checkpoints;
- artifact submission.

## Fase 3 — Code generation

- generated web experience;
- sandbox;
- contract test runner;
- preview;
- publish.

## Fase 4 — Advanced simulations

- richer state systems;
- 3D;
- virtual labs;
- collaborative sync;
- specialized component SDKs.

La arquitectura debe permitir Fase 4 desde el comienzo, aunque no todos los formatos estén terminados el primer día.

---

# 147. Arquitectura final

```text
RECOMMENDATION ENGINE
        ↓
Recommendation + ActionSpec
        ↓
┌──────────────────────────────────────┐
│          EXPERIENCE ENGINE           │
│                                      │
│ Planner                              │
│ Format selection                     │
│ Pedagogical sequence                 │
│ Opportunity design                   │
│ Evidence contract                    │
│ Personalization envelope             │
│ Generator                            │
│ Validator                            │
└──────────────────────────────────────┘
        ↓
ExperienceDefinition
        ↓
┌──────────────────────────────────────┐
│        EXPERIENCE RUNTIME            │
│                                      │
│ Session state                        │
│ Interaction                          │
│ Assistance                           │
│ Feedback                             │
│ Live orchestration                   │
│ Event stream                         │
│ Completion                           │
└──────────────────────────────────────┘
        ↓
RuntimeEvents
        ↓
EVIDENCE ENGINE
        ↓
INTERPRETATION ENGINE
        ↓
RECOMMENDATION ENGINE
```

---

# 148. Definición final

> **El Experience Engine de Educai convierte una decisión pedagógica en una situación concreta donde el estudiante tiene razones para pensar, actuar, recibir feedback y volver a intentar. El Runtime garantiza que esa experiencia ocurra de forma segura, instrumentada y trazable.**

La calidad del sistema no se mide por cuán llamativa es la simulación.

Se mide por si la experiencia:

- provoca el proceso mental correcto;
- ayuda al estudiante a avanzar;
- produce evidencia válida cuando corresponde;
- respeta la autonomía y privacidad;
- funciona en el contexto real del aula;
- deja al sistema mejor informado para tomar la siguiente decisión.

El loop completo de Educai queda así:

```text
CURRÍCULA
↓
EVIDENCIA
↓
INTERPRETACIÓN
↓
RECOMENDACIÓN
↓
EXPERIENCIA
↓
NUEVA EVIDENCIA
↓
NUEVA INTERPRETACIÓN
↓
NUEVA DECISIÓN
```

Ese loop es el núcleo operativo del producto.