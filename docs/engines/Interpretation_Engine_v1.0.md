# Educai — Interpretation Engine

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo de documento:** Product + System Specification  
**Estado:** Especificación funcional para implementación  
**Dependencias:** Modelo Curricular v1 + Evidence Engine v1  

---

# 0. Resumen ejecutivo

El **Interpretation Engine** es la capa de Educai que convierte múltiples señales de evidencia sobre una capacidad en una interpretación académica actual, trazable y revisable.

Su función no es observar qué ocurrió —eso pertenece al **Evidence Engine**— ni decidir qué actividad ejecutar después —eso pertenece al **Recommendation Engine**.

Su responsabilidad es responder:

> **Dada toda la evidencia válida disponible sobre una capacidad, ¿qué podemos sostener razonablemente hoy sobre el aprendizaje del estudiante, con qué nivel de certeza y qué sigue siendo incierto?**

El motor debe evitar dos errores simétricos:

- concluir demasiado a partir de una respuesta aislada;
- ignorar señales útiles por exigir certeza imposible.

La arquitectura central es:

```text
MODELO CURRICULAR
"qué capacidad estamos observando"
        +
EVIDENCE ENGINE
"qué hizo el estudiante y qué señal aporta"
        ↓
INTERPRETATION ENGINE
"qué creemos actualmente y por qué"
        ↓
RECOMMENDATION ENGINE
"qué conviene hacer ahora"
```

Los estados visibles del estudiante son:

- **Todavía no sabemos**
- **En desarrollo**
- **Evidencia sólida**
- **Conviene revisar**

Estos estados no representan porcentajes de comprensión ni probabilidades psicométricas. Son **etiquetas operativas derivadas de evidencia observable**.

---

# 1. Objetivo

El Interpretation Engine debe:

1. agrupar señales válidas por capacidad;
2. diferenciar evidencia positiva, negativa, ambigua e inelegible;
3. reconocer cuándo existen suficientes oportunidades independientes;
4. considerar demanda cognitiva, asistencia, procedencia y recencia;
5. detectar patrones de error recurrentes;
6. detectar contradicciones;
7. distinguir desempeño histórico de estado actual;
8. producir un estado académico visible;
9. mantener trazabilidad completa;
10. expresar qué evidencia falta para interpretar mejor;
11. recalcular cuando cambia la evidencia o el modelo;
12. entregar outputs consistentes al panel estudiante, panel docente y Recommendation Engine.

---

# 2. Qué NO hace

El Interpretation Engine no debe:

- generar la currícula;
- decidir a qué capacidad pertenece una evidencia en primera instancia;
- evaluar una respuesta cruda sin pasar por Evidence Engine;
- crear actividades;
- recomendar automáticamente la próxima actividad;
- afirmar que un alumno “domina” una materia;
- producir un porcentaje de comprensión individual;
- convertir preferencias o autopercepción en capacidad académica;
- tratar tiempo de estudio como evidencia de aprendizaje;
- usar la respuesta de la IA como evidencia del alumno;
- ocultar contradicciones para producir un estado más limpio;
- inferir causalidad institucional.

---

# 3. Principio rector

La interpretación debe conservar esta separación:

```text
EVIDENCE EVENT
qué ocurrió

↓

EVIDENCE SIGNAL
qué indica esa acción respecto de una capacidad

↓

CAPABILITY INTERPRETATION
qué podemos sostener actualmente después de comparar múltiples señales
```

Una sola señal puede ser informativa, pero rara vez debería producir una conclusión fuerte por sí sola.

---

# 4. Inputs obligatorios

Para interpretar una capacidad, el motor recibe:

## 4.1. Capability

Como mínimo:

```text
capability_id
statement
target_cognitive_level
prerequisite_capability_ids
importance
curriculum_version_id
```

## 4.2. EvidenceSignals

Cada señal incluye como mínimo:

```text
evidence_signal_id
evidence_event_id
capability_id
performance
polarity
demonstrated_level
task_cognitive_demand
error_type
mapping_confidence
evidence_quality_band
assistance_level
provenance_quality
opportunity_id
timestamp
state_eligible
```

## 4.3. Estado anterior

```text
previous_capability_state
previous_interpretation_version
```

Esto permite distinguir:

> “todavía no había evidencia”

de

> “antes había evidencia sólida y apareció una dificultad nueva”.

## 4.4. Contexto temporal

- fecha actual;
- período/cátedra vigente;
- orden de oportunidades;
- fecha de cada señal.

---

# 5. Output principal

El motor produce un `CapabilityInterpretation`.

```json
{
  "student_id": "stu_123",
  "course_section_id": "sec_45",
  "capability_id": "CAP-SCRUM-04",

  "visible_state": "in_development",
  "maturity_state": "developing",
  "attention_state": "none",

  "evidence_sufficiency": "sufficient",
  "interpretation_confidence": "medium",

  "highest_reliably_demonstrated_level": "apply",
  "historical_peak_state": "solid",

  "supporting_opportunity_ids": ["opp_1", "opp_2"],
  "challenging_opportunity_ids": ["opp_3"],

  "unresolved_error_patterns": [],
  "contradictions": [],

  "next_evidence_need": {
    "type": "independent_application",
    "description": "Necesitamos otra oportunidad independiente de aplicación sin ayuda sustancial."
  },

  "rationale": {
    "summary": "Hay evidencia positiva de aplicación, pero todavía falta una segunda demostración independiente consistente.",
    "supporting_evidence_ids": ["sig_1", "sig_2"],
    "challenging_evidence_ids": ["sig_3"]
  },

  "interpretation_version": "1.0",
  "computed_at": "..."
}
```

---

# 6. Separar estado visible de estructura interna

Los cuatro estados visibles son simples para UX, pero internamente el motor necesita más precisión.

Por eso se separan dos dimensiones:

## 6.1. Maturity state

```text
unknown
developing
solid
```

Representa qué tan respaldada está actualmente la capacidad por evidencia positiva.

## 6.2. Attention state

```text
none
review
```

Representa si existe una dificultad recurrente o un patrón que requiere atención.

## 6.3. Visible state

Se deriva así:

```text
si attention_state = review
    visible_state = needs_review
sino
    visible_state = maturity_state
```

Mapeo:

| Interno | Visible |
|---|---|
| unknown + none | Todavía no sabemos |
| developing + none | En desarrollo |
| solid + none | Evidencia sólida |
| cualquier maturity + review | Conviene revisar |

Esta separación evita perder información.

Un estudiante puede haber demostrado históricamente una capacidad y, al mismo tiempo, presentar una dificultad reciente que conviene revisar.

---

# 7. Estados visibles

## 7.1. Todavía no sabemos

Significa:

> No existe evidencia suficientemente informativa para sostener una interpretación académica actual.

No significa:

> “No sabe”.

Casos típicos:

- no hay evidencia;
- solo hay self-report;
- únicamente existe evidencia inelegible;
- el mapeo a capacidad es demasiado incierto;
- toda la evidencia fue producida después de que la respuesta fue revelada.

---

## 7.2. En desarrollo

Significa:

> Existe evidencia académica útil, pero todavía no es suficiente, consistente o exigente como para considerar la capacidad sólidamente demostrada.

Puede aparecer cuando:

- existe una sola demostración fuerte;
- varias evidencias son de nivel inferior al objetivo;
- hay señales mixtas sin patrón claro;
- la asistencia fue relevante;
- falta independencia entre oportunidades;
- existe una señal negativa aislada que todavía no constituye un patrón.

---

## 7.3. Evidencia sólida

Significa:

> La capacidad fue demostrada consistentemente en más de una oportunidad independiente, con demanda cognitiva adecuada y sin una dificultad recurrente no resuelta.

No significa:

- conocimiento permanente;
- dominio absoluto;
- ausencia futura de errores.

---

## 7.4. Conviene revisar

Significa:

> Apareció una dificultad recurrente o una concepción errónea relevante respaldada por evidencia suficiente como para justificar una intervención.

No equivale a:

> “No entiende”.

Es un estado de atención pedagógica.

---

# 8. Elegibilidad de señales

Antes de interpretar, cada `EvidenceSignal` debe pasar un filtro.

Una señal es `eligible` si:

1. `state_eligible = true`;
2. pertenece al estudiante correcto;
3. pertenece a la cátedra correcta;
4. corresponde a la versión curricular activa o tiene un mapping migrado válido;
5. no fue invalidada por eliminación de fuente;
6. no es duplicada;
7. `mapping_confidence >= 0.60`;
8. la acción es atribuible al estudiante;
9. la señal no depende exclusivamente de una respuesta previamente revelada.

## 8.1. Uso por confianza de mapping

Regla inicial:

| Mapping confidence | Uso |
|---:|---|
| `>= 0.85` | señal principal |
| `0.60–0.84` | señal secundaria |
| `< 0.60` | no modifica estado |

Estos umbrales son **hipótesis de implementación a calibrar**, no propiedades científicas.

---

# 9. Calidad de evidencia

El Interpretation Engine no recalcula la calidad; consume la banda generada por Evidence Engine.

Valores:

- `HIGH`
- `MEDIUM`
- `LOW`
- `INELIGIBLE`

Uso:

## HIGH

Puede contribuir directamente a transiciones de estado.

## MEDIUM

Puede contribuir a transiciones cuando está acompañada por otra evidencia.

## LOW

Aporta contexto, pero por sí sola no debe llevar a `solid` ni crear un patrón de revisión.

## INELIGIBLE

No participa en el cálculo del estado.

---

# 10. Demanda cognitiva y alineación con la capacidad

Cada `Capability` tiene un `target_cognitive_level`.

Orden:

```text
recognize < explain < apply < solve < transfer
```

## 10.1. Evidencia positiva

Para que una señal positiva sea considerada una demostración **al nivel objetivo**, debe cumplirse:

```text
demonstrated_level >= target_cognitive_level
```

Una señal positiva de nivel inferior puede contribuir a `developing`, pero no basta para `solid` en una capacidad de nivel superior.

Ejemplo:

Capacidad:

> Resolver situaciones ambiguas entre PO y SM.

Objetivo:

`solve`

Evidencia:

> Explica correctamente la diferencia conceptual.

Nivel:

`explain`

Resultado:

> evidencia útil, pero insuficiente para demostrar la capacidad objetivo.

---

## 10.2. Evidencia negativa

Una falla debe desafiar una capacidad únicamente si la tarea realmente exigía esa capacidad.

Regla:

```text
task_cognitive_demand >= target_cognitive_level
```

Una falla de transferencia no debe destruir automáticamente evidencia sólida de aplicación básica si existen capacidades separadas para ambos niveles.

---

# 11. Oportunidades independientes

La unidad utilizada para suficiencia es la **oportunidad independiente**, no la cantidad de clicks o mensajes.

Ejemplo:

```text
Pregunta
  ├ respuesta A
  ├ justificación
  └ corrección
```

puede seguir siendo una sola oportunidad.

En cambio:

```text
Escenario 1 — priorización
Escenario 2 — impedimentos
Escenario 3 — conflicto de stakeholders
```

pueden constituir oportunidades independientes si:

- exigen decisiones diferenciadas;
- no revelan entre sí la respuesta;
- cada escenario permite demostrar la capacidad nuevamente.

El motor agrupa señales por `opportunity_id` antes de interpretar.

---

# 12. Normalización por oportunidad

Dentro de una misma oportunidad puede haber señales positivas y negativas.

Antes de actualizar un estado, se genera un `OpportunityAssessment`.

Ejemplo:

```json
{
  "opportunity_id": "opp_55",
  "capability_id": "CAP-X",
  "result": "supports",
  "quality": "HIGH",
  "demonstrated_level": "apply",
  "assistance_level": "light_prompting",
  "error_patterns": []
}
```

Valores de `result`:

```text
supports
challenges
mixed
indeterminate
```

Esto impide que una conversación larga con veinte mensajes se convierta artificialmente en veinte votos independientes.

---

# 13. Evidencia suficiente

El motor debe distinguir entre **estado** y **suficiencia de evidencia**.

`evidence_sufficiency`:

```text
none
limited
sufficient
robust
```

## NONE

- 0 oportunidades elegibles relevantes.

## LIMITED

Casos típicos:

- 1 sola oportunidad relevante;
- evidencia solo LOW;
- evidencia muy asistida;
- evidencia únicamente por debajo del nivel objetivo.

## SUFFICIENT

Regla inicial:

- al menos 2 oportunidades independientes relevantes;
- al menos una `HIGH` o dos `MEDIUM`;
- al menos una oportunidad al nivel objetivo;
- al menos una oportunidad con asistencia `none` o `light_prompting`.

## ROBUST

Regla inicial:

- al menos 3 oportunidades independientes;
- al menos 2 oportunidades `HIGH` o `MEDIUM` al nivel objetivo o superior;
- al menos 2 contextos, escenarios o momentos distintos;
- evidencia predominantemente independiente;
- ninguna respuesta revelada cuenta como demostración.

Los valores se calibrarán con pilotos.

---

# 14. Interpretación de asistencia

La asistencia no invalida automáticamente una evidencia, pero afecta cuánto puede sostener.

Orden:

```text
none
light_prompting
scaffolded
substantial
answer_revealed
unknown
```

## Reglas

### none

Puede demostrar capacidad plenamente.

### light_prompting

Puede demostrar capacidad si la pista no contiene la solución central.

### scaffolded

Puede sostener `developing`, pero no debería ser la única base de `solid`.

### substantial

Aporta información sobre aprendizaje guiado, pero no prueba autonomía.

### answer_revealed

No es elegible como demostración positiva de esa misma oportunidad.

### unknown

Se interpreta conservadoramente.

---

# 15. Modelo de madurez

El `maturity_state` se resuelve sobre evidencia positiva actual.

## 15.1. unknown

Se asigna si:

- `evidence_sufficiency = none`; o
- no existe ninguna oportunidad interpretable relevante.

## 15.2. developing

Se asigna si existe evidencia académica útil pero no cumple los requisitos de `solid`.

Ejemplos:

- una demostración positiva fuerte;
- dos positivas pero ambas muy asistidas;
- evidencia positiva únicamente por debajo del target;
- evidencia mixta;
- una señal negativa aislada;
- recuperación todavía no confirmada.

## 15.3. solid

Regla inicial para el MVP:

Debe existir:

1. al menos 2 oportunidades independientes que apoyan la capacidad;
2. al menos una oportunidad `HIGH`;
3. al menos una oportunidad al nivel objetivo o superior;
4. al menos una oportunidad con `none` o `light_prompting`;
5. consistencia mayoritaria en la ventana actual;
6. ningún patrón de dificultad no resuelto al nivel objetivo.

No se exige que todas las oportunidades sean correctas.

---

# 16. Ventana actual de evidencia

Educai debe conservar toda la historia, pero no interpretar eternamente al estudiante por un error del comienzo de la cursada.

Por eso se separan:

- **historial completo**;
- **ventana actual**.

## 16.1. Default inicial

Para una capacidad:

> las últimas **5 oportunidades independientes elegibles** al nivel relevante, dentro de la cátedra actual.

Si hay menos de cinco, usar todas.

## 16.2. Regla temporal adicional

Por defecto, una señal de más de **90 días** no entra automáticamente en la ventana actual si existen evidencias más recientes suficientes.

Continúa disponible en el historial.

Estos valores son configurables y deben calibrarse.

---

# 17. Historial vs estado actual

Guardar:

```text
current_maturity_state
historical_peak_state
historical_peak_date
```

Ejemplo:

> Mayo: Evidencia sólida.
>
> Junio: aparecen errores recurrentes en un contexto más complejo.

Educai no debe fingir que la evidencia anterior nunca existió.

Puede mostrar:

> **Conviene revisar**  
> Antes habías mostrado evidencia sólida en situaciones básicas; apareció una dificultad reciente en escenarios más ambiguos.

---

# 18. Detección de patrones de dificultad

Una señal negativa aislada no activa automáticamente `review`.

Se crea un `ErrorPattern` cuando varias señales desafían la misma capacidad de forma relacionada.

Ejemplo:

```text
error_pattern_id
capability_id
normalized_error_type
semantic_description
supporting_signal_ids
first_seen_at
last_seen_at
status
```

`status`:

```text
candidate
confirmed
resolved
```

---

# 19. Regla inicial para confirmar un patrón

Un patrón pasa a `confirmed` si ocurre cualquiera de estas condiciones:

### Regla A — repetición independiente

Al menos **2 oportunidades independientes** `HIGH/MEDIUM` muestran el mismo error o una dificultad semánticamente equivalente.

### Regla B — experiencia rica

Dentro de una experiencia instrumentada existen al menos **2 escenarios independientes** donde aparece el mismo error, sin que la respuesta haya sido revelada entre ambos.

### Regla C — misconception crítica corroborada

Una señal `HIGH` detecta una concepción errónea central y otra señal `MEDIUM/HIGH` posterior la corrobora.

Una sola falla, aunque sea clara, queda como:

> señal de dificultad pendiente de confirmación.

---

# 20. Attention state = review

Se activa cuando existe al menos un `ErrorPattern.status = confirmed` y no está resuelto.

```text
confirmed unresolved error pattern
↓
attention_state = review
↓
visible_state = needs_review
```

---

# 21. Resolución de un patrón de error

Un error confirmado no permanece para siempre.

Default inicial para `resolved`:

1. existen **2 oportunidades independientes posteriores** al último error;
2. ambas apoyan la capacidad o el aspecto específico corregido;
3. al menos una es `HIGH`;
4. ambas tienen asistencia `none` o `light_prompting`;
5. el mismo error no reaparece entre ellas.

Al resolverse:

```text
attention_state = none
```

El `maturity_state` se recalcula normalmente.

La historia del error se conserva.

---

# 22. Contradicciones

Una contradicción no es una propiedad de una señal individual.

Aparece cuando señales válidas parecen sostener conclusiones distintas.

Tipos iniciales:

## 22.1. Contradicción por nivel

Ejemplo:

> explica correctamente pero falla al aplicar.

Interpretación:

> comprensión declarativa consistente; aplicación en desarrollo.

## 22.2. Contradicción por contexto

Ejemplo:

> resuelve bien casos académicos, falla al trasladarlo a un proyecto real.

## 22.3. Contradicción por fuente

Ejemplo:

> chat importado muy positivo, simulación Educai negativa.

No asumir fraude.

Puede deberse a asistencia, contexto o calidad de la fuente.

## 22.4. Contradicción temporal

Ejemplo:

> errores antiguos + evidencia reciente consistente.

Puede indicar aprendizaje.

## 22.5. Contradicción por asistencia

Ejemplo:

> funciona con scaffolding, falla sin ayuda.

Interpretación:

> capacidad parcialmente construida, autonomía todavía no demostrada.

---

# 23. Contradiction object

```json
{
  "type": "assistance",
  "capability_id": "CAP-X",
  "evidence_groups": {
    "group_a": ["sig_1", "sig_2"],
    "group_b": ["sig_3"]
  },
  "status": "open",
  "interpretation": "El estudiante resuelve correctamente con andamiaje, pero todavía no lo demuestra de forma independiente.",
  "next_evidence_needed": "independent_application"
}
```

La contradicción debe aumentar la incertidumbre y orientar la próxima evidencia requerida.

---

# 24. Interpretation confidence

No representa una probabilidad matemática de que la interpretación sea verdadera.

Es una banda operativa sobre la calidad del respaldo disponible.

Valores:

```text
low
medium
high
```

## LOW

- evidencia limitada;
- mapping débil;
- mucha asistencia;
- contradicciones importantes;
- pocas oportunidades.

## MEDIUM

- evidencia suficiente;
- interpretación razonablemente consistente;
- todavía hay alguna incertidumbre relevante.

## HIGH

- evidencia robusta;
- múltiples oportunidades independientes;
- adecuada demanda cognitiva;
- baja asistencia;
- alta consistencia;
- contradicciones explicadas o resueltas.

No mostrar esta banda como “92% de confianza”.

---

# 25. Orden de resolución del estado

El algoritmo debe resolver en este orden:

```text
1. filtrar señales elegibles
2. agrupar por opportunity_id
3. construir OpportunityAssessments
4. determinar evidence_sufficiency
5. detectar/actualizar ErrorPatterns
6. detectar contradicciones
7. calcular maturity_state
8. calcular attention_state
9. derivar visible_state
10. determinar interpretation_confidence
11. determinar highest_reliably_demonstrated_level
12. generar next_evidence_need
13. generar rationale trazable
```

---

# 26. Regla para `highest_reliably_demonstrated_level`

Educai debe poder decir cuál es el nivel cognitivo más alto respaldado de forma confiable.

Para aceptar un nivel como `reliably_demonstrated`:

- al menos 2 oportunidades independientes de soporte en ese nivel o superior;
- al menos una `HIGH`;
- al menos una con asistencia `none/light_prompting`;
- no existe un patrón confirmado no resuelto específicamente en ese nivel.

Ejemplo:

```text
Explain   ✓
Apply     ✓
Solve     todavía no
Transfer  todavía no
```

Esto permite construir la visualización:

> Comprender ✓ → Aplicar ✓ → Resolver ● → Transferir ○

sin inventar porcentajes.

---

# 27. Prerrequisitos

El Interpretation Engine no debe propagar automáticamente un error hacia todas las capacidades dependientes.

Si:

```text
A prerequisite_of B
```

y A está en `needs_review`, el motor puede producir:

```text
prerequisite_risk = true
```

para B.

Pero B conserva su propio estado basado en su propia evidencia.

Ejemplo:

> “Diferenciar PO y SM” necesita revisión.
>
> “Resolver situaciones ambiguas entre roles” todavía no tiene evidencia.

No afirmar automáticamente que la segunda también está mal.

---

# 28. Evidencia negativa en una capacidad históricamente sólida

Una falla aislada no destruye `solid`.

Casos:

### Una falla aislada

Mantener estado si el resto de la ventana es consistente.

Agregar:

> señal de dificultad aislada.

### Dos fallas relacionadas independientes

Crear/confirmar patrón.

Resultado:

> `attention_state = review`.

### Fallas en un nivel cognitivo superior

Si existe una capacidad distinta para ese nivel, mapear la dificultad allí.

No degradar innecesariamente capacidades inferiores.

---

# 29. Recuperación y aprendizaje observable

Una transición desde `needs_review` hacia un estado mejor es especialmente valiosa porque representa un loop de aprendizaje potencialmente cerrado.

Ejemplo:

```text
Conviene revisar
↓
actividad específica
↓
feedback
↓
nuevas oportunidades
↓
En desarrollo
↓
nueva evidencia independiente
↓
Evidencia sólida
```

Registrar cada transición con:

```text
from_state
to_state
triggering_evidence_ids
transition_reason
occurred_at
interpretation_version
```

Estas transiciones alimentan las métricas de aprendizaje del producto.

---

# 30. Next Evidence Need

El Interpretation Engine no recomienda una actividad específica.

Sí debe indicar **qué tipo de evidencia falta**.

Valores posibles:

```text
more_evidence
independent_attempt
unassisted_attempt
higher_cognitive_level
new_context
error_retest
transfer_opportunity
contradiction_resolution
no_additional_evidence_needed
```

Ejemplo:

```json
{
  "type": "unassisted_attempt",
  "target_level": "apply",
  "reason": "Las dos demostraciones positivas disponibles fueron altamente guiadas."
}
```

El Recommendation Engine convierte esto en una acción concreta.

---

# 31. Rationale estructurado

Toda interpretación debe poder explicarse sin volver a pedirle al LLM que “invente una explicación”.

Guardar:

```text
state_reason_codes
supporting_evidence_ids
challenging_evidence_ids
resolved_error_pattern_ids
unresolved_error_pattern_ids
contradiction_ids
sufficiency_reason
next_evidence_reason
```

Después una capa de lenguaje natural puede convertirlo en:

> “Mostraste dos aplicaciones correctas sin ayuda importante, pero todavía no tenemos evidencia en un contexto nuevo.”

---

# 32. Explicación para el estudiante

Debe ser breve.

Ejemplo:

### En desarrollo

> Ya diferenciás correctamente Product Owner y Scrum Master en situaciones directas. Todavía necesitamos verte resolver un caso más ambiguo sin ayuda.

**¿Por qué?**

> Lo aplicaste correctamente en dos ejercicios. En el último caso necesitaste una pista para distinguir quién debía decidir la prioridad.

No mostrar:

- scores internos;
- confidence decimals;
- reglas de threshold;
- lenguaje técnico del motor.

---

# 33. Explicación para el docente

Puede ser más precisa.

Ejemplo:

> **44% necesita revisar esta capacidad.**
>
> Basado en 27 estudiantes con evidencia suficiente.
>
> El patrón principal es confundir la responsabilidad del Scrum Master con la priorización del Product Backlog.

Al profundizar:

- 12/27 con patrón de revisión;
- tipos de fuentes;
- cantidad de oportunidades;
- ejemplos anonimizados;
- contradicciones relevantes.

---

# 34. Agregación del aula

La agregación docente ocurre **después** de interpretar estados individuales.

Para una capacidad:

```text
eligible_classroom_denominator =
estudiantes con evidence_sufficiency ∈ {sufficient, robust}
```

Ejemplo:

```text
42 inscriptos
27 con evidencia suficiente
12 needs_review
```

Mostrar:

> **44% necesita revisar**
>
> Basado en 27 estudiantes con evidencia suficiente.

Cálculo:

```text
12 / 27 = 44.4%
```

No:

```text
12 / 42
```

porque 15 estudiantes todavía no aportan evidencia suficiente para esa capacidad.

---

# 35. Cobertura de evidencia

Debe acompañar la interpretación agregada.

```text
evidence_coverage =
estudiantes con evidencia suficiente / estudiantes inscriptos activos
```

Ejemplo:

> Cobertura de evidencia: 64%

Esto permite distinguir:

> “El aula está bien”

versus

> “Todavía sabemos poco sobre el aula”.

---

# 36. Umbral de privacidad para agregados

Regla inicial:

> no mostrar un agregado segmentado si el denominador es menor a **5 estudiantes**.

En ese caso:

> **Todavía no hay suficiente evidencia agregada para mostrar este resultado de forma segura.**

El umbral debe ser configurable por política y contexto.

---

# 37. Perfil profesional y Interpretation Engine académico

Mantener sistemas separados.

El Interpretation Engine académico procesa:

```text
capabilities académicas
EvidenceSignals académicas
```

El perfil profesional procesa:

```text
preferencias
intereses
comportamientos
experiencias
microfeedback
```

Una misma experiencia puede alimentar ambos sistemas, pero mediante señales distintas.

Ejemplo:

```text
Resuelve correctamente una decisión estratégica
→ señal académica

Dice que disfrutó asumir esa responsabilidad
→ señal de autoconocimiento
```

Nunca fusionarlas.

---

# 38. Recálculo

Se debe recalcular una capacidad cuando:

- llega nueva evidencia elegible;
- una evidencia es invalidada;
- el estudiante elimina una fuente;
- cambia el mapping de una evidencia;
- se resuelve una duplicación;
- cambia la definición de una capacidad;
- se migra la currícula;
- cambia la versión del Interpretation Engine;
- se corrige un error de procesamiento.

---

# 39. Versionado

Toda interpretación debe registrar:

```text
interpretation_engine_version
curriculum_version
evidence_processing_version
computed_at
```

Nunca sobrescribir silenciosamente un estado histórico.

Guardar snapshots o transitions.

Esto permite responder:

> “¿Por qué este estado cambió?”

---

# 40. Eliminación de una fuente

Ejemplo:

```text
student deletes conversation
↓
SourceArtifact invalid
↓
EvidenceEvents invalid
↓
EvidenceSignals invalid
↓
Interpretation recalculates
↓
CapabilityState may change
↓
Recommendation recalculates
```

Si la fuente eliminada sostenía exclusivamente `solid`, el estado debe poder volver a `developing` o `unknown`.

---

# 41. Responsabilidad del LLM vs lógica determinista

La arquitectura debe separar ambas.

## El LLM puede ayudar a:

- interpretar lenguaje abierto;
- clusterizar errores semánticamente equivalentes;
- explicar contradicciones;
- generar rationale en lenguaje natural;
- reconocer si dos errores expresan la misma misconception.

## El LLM NO debería decidir libremente:

- si hay evidencia suficiente;
- cuántas oportunidades independientes existen;
- si un duplicado cuenta;
- si una respuesta revelada demuestra capacidad;
- qué threshold activa `solid`;
- qué threshold activa `review`;
- qué estudiantes entran en el denominador docente.

Estas reglas deben vivir en código/versionado.

---

# 42. Pseudocódigo principal

```text
function interpretCapability(student, section, capability):

    signals = loadSignals(student, section, capability)

    eligible = filterEligible(signals)

    opportunities = groupAndNormalizeByOpportunity(eligible)

    currentWindow = selectCurrentWindow(opportunities)

    sufficiency = computeEvidenceSufficiency(currentWindow)

    errorPatterns = updateErrorPatterns(currentWindow)

    contradictions = detectContradictions(currentWindow, errorPatterns)

    maturity = resolveMaturity(
        currentWindow,
        capability.targetLevel,
        sufficiency,
        errorPatterns
    )

    attention = resolveAttention(errorPatterns)

    if attention == REVIEW:
        visible = NEEDS_REVIEW
    else:
        visible = mapMaturityToVisible(maturity)

    highestLevel = computeHighestReliableLevel(currentWindow)

    confidence = computeInterpretationConfidence(
        sufficiency,
        currentWindow,
        contradictions
    )

    nextEvidenceNeed = determineNextEvidenceNeed(
        capability,
        maturity,
        attention,
        currentWindow,
        contradictions
    )

    rationale = buildStructuredRationale(...)

    persistSnapshotAndTransition(...)

    return CapabilityInterpretation(...)
```

---

# 43. Resolver maturity — pseudocódigo

```text
function resolveMaturity(window, targetLevel, sufficiency, errorPatterns):

    if no interpretable opportunities:
        return UNKNOWN

    supportsAtTarget = opportunities where:
        result == SUPPORTS
        and demonstrated_level >= targetLevel
        and quality in {HIGH, MEDIUM}

    independentStrongSupports = unique opportunities in supportsAtTarget

    hasHigh = any quality == HIGH

    hasLowAssistance = any assistance in {NONE, LIGHT_PROMPTING}

    unresolvedTargetPattern = exists confirmed unresolved error pattern

    if count(independentStrongSupports) >= 2
       and hasHigh
       and hasLowAssistance
       and not unresolvedTargetPattern
       and majorityCurrentEvidenceIsSupportive:

        return SOLID

    return DEVELOPING
```

---

# 44. Resolver review — pseudocódigo

```text
function resolveAttention(errorPatterns):

    for pattern in errorPatterns:
        if pattern.status == CONFIRMED
           and pattern.resolution_status != RESOLVED:
            return REVIEW

    return NONE
```

---

# 45. Ejemplo end-to-end 1 — Product Owner vs Scrum Master

Capacidad:

> **Asignar correctamente responsabilidades al Product Owner y Scrum Master frente a situaciones de un Sprint.**

Target:

`apply`

## Oportunidad 1 — chat Educai

El alumno explica correctamente quién prioriza el backlog.

```text
supports
level = explain
quality = HIGH
assistance = none
```

No alcanza target.

Estado:

> En desarrollo.

## Oportunidad 2 — simulación

Caso de priorización.

Respuesta correcta sin ayuda.

```text
supports
level = apply
quality = HIGH
```

Estado:

> En desarrollo.

Todavía hay una sola oportunidad positiva al target.

## Oportunidad 3 — simulación distinta

Caso de cambio de prioridad.

Respuesta correcta.

```text
supports
level = apply
quality = HIGH
```

Ahora:

- 2 oportunidades independientes;
- target alcanzado;
- baja asistencia;
- consistencia.

Estado:

> **Evidencia sólida.**

## Oportunidad 4 — impedimento

Asigna eliminación de impedimentos al Product Owner.

```text
challenges
level = apply
error = role_responsibility_confusion
```

Una sola falla.

Estado:

> **Evidencia sólida**

con señal aislada.

## Oportunidad 5 — otro impedimento

Repite la misma confusión.

Se confirma patrón.

Estado visible:

> **Conviene revisar.**

Detalle:

> Había evidencia sólida en priorización, pero apareció una dificultad recurrente al asignar responsabilidad sobre impedimentos.

---

# 46. Ejemplo end-to-end 2 — asistencia

Capacidad:

> Aplicar TAM/SAM/SOM a un caso.

## Oportunidad 1

Correcta, pero la IA dio una guía paso a paso.

```text
supports
apply
MEDIUM
scaffolded
```

## Oportunidad 2

Correcta, nuevamente con scaffolding.

```text
supports
apply
MEDIUM
scaffolded
```

Resultado:

> **En desarrollo**

No `solid`.

`next_evidence_need`:

> **unassisted_attempt**

El Recommendation Engine podrá crear:

> “Resolvé un nuevo caso sin pistas.”

---

# 47. Ejemplo end-to-end 3 — aprendizaje después de error

Capacidad:

> Interpretar evidencia contradictoria.

Oportunidades 1 y 2:

> mismo error → `needs_review`.

Educai propone experiencia específica.

Oportunidad 3:

> correcta sin ayuda.

El patrón todavía no se considera resuelto.

Estado:

> Conviene revisar.

Oportunidad 4:

> nuevo contexto, correcta sin ayuda.

Patrón resuelto.

Resultado:

> **Evidencia sólida** o **En desarrollo**, según el resto de la ventana y el target.

Registrar transición.

---

# 48. Casos límite

## 48.1. Solo una respuesta excelente

No `solid`.

> En desarrollo.

## 48.2. Diez respuestas del mismo ejercicio

No equivalen automáticamente a diez oportunidades.

## 48.3. Toda la evidencia fue con respuesta revelada

> Todavía no sabemos.

## 48.4. Evidencia positiva solo de nivel inferior

> En desarrollo.

## 48.5. Una respuesta equivocada después de meses de buen desempeño

No activar `review` automáticamente.

## 48.6. Dos errores equivalentes recientes

Puede confirmar patrón y activar `review`.

## 48.7. Chat externo positivo + simulación negativa

Crear contradicción por fuente/contexto. No decidir automáticamente que una fuente “miente”.

## 48.8. Perfil dice “soy bueno en esto” sin evidencia académica

No afecta estado.

## 48.9. El docente cree que el hallazgo es incorrecto

Registrar validación docente como `human_feedback_on_interpretation`, no modificar silenciosamente evidencia del estudiante.

Puede disparar revisión del mapping o del motor.

---

# 49. Validación docente

El docente puede responder:

- Sí
- Parcialmente
- No
- Todavía no sé

Esto no reemplaza la evidencia académica.

Sirve para:

- evaluar calidad del motor;
- detectar fallas de mapping;
- mejorar prompts/reglas;
- priorizar auditoría.

No utilizar automáticamente:

> “docente dijo no” → cambiar 12 estados individuales.

Primero investigar la causa.

---

# 50. Métricas del Interpretation Engine

## 50.1. Teacher Agreement Rate

Porcentaje de hallazgos revisados por docentes marcados como:

- Sí;
- Parcialmente.

Separar ambos valores.

## 50.2. State Stability

Cuántos estados cambian inmediatamente ante una sola evidencia nueva.

Un motor excesivamente volátil es mala señal.

## 50.3. Evidence Sufficiency Coverage

Porcentaje de capacidades relevantes con evidencia suficiente.

## 50.4. Contradiction Rate

Porcentaje de interpretaciones con contradicciones abiertas.

No necesariamente debe minimizarse; puede representar honestidad del sistema.

## 50.5. Error Pattern Confirmation Precision

En muestras auditadas:

> ¿los patrones confirmados representan realmente una dificultad recurrente?

## 50.6. State Audit Accuracy

Evaluación humana ciega sobre una muestra de estados y evidencias.

## 50.7. Recovery Detection

Capacidad de detectar correctamente cuándo un error antes recurrente dejó de aparecer.

---

# 51. Dataset de evaluación interna

Antes de producción, construir casos etiquetados manualmente con:

- evidencia positiva consistente;
- evidencia insuficiente;
- asistencia alta;
- contradicciones;
- errores recurrentes;
- errores aislados;
- mejora después de feedback;
- regresión posterior;
- importaciones externas ambiguas;
- duplicados;
- cambios de currícula.

Cada caso debe tener:

```text
expected_sufficiency
expected_maturity
expected_attention
expected_visible_state
expected_error_patterns
expected_contradictions
```

Las nuevas versiones del motor deben correr contra este set antes de desplegarse.

---

# 52. Criterios de aceptación

El Interpretation Engine v1 está listo cuando puede demostrar que:

1. una sola respuesta correcta no produce `solid`;
2. una sola respuesta incorrecta no produce `needs_review`;
3. evidencia altamente asistida no demuestra autonomía;
4. una respuesta revelada no cuenta como evidencia positiva independiente;
5. dos errores recurrentes independientes pueden activar `review`;
6. dos demostraciones independientes suficientes pueden producir `solid`;
7. una dificultad resuelta puede dejar de activar `review`;
8. las contradicciones se conservan y explican;
9. una falla de nivel superior no destruye automáticamente una capacidad inferior distinta;
10. todas las conclusiones se pueden rastrear hasta evidencias concretas;
11. la eliminación de una fuente recalcula el estado;
12. el motor conserva historial de transiciones;
13. el mismo conjunto de inputs + misma versión produce el mismo estado estructural;
14. el LLM no decide thresholds estructurales;
15. los agregados docentes utilizan solo estudiantes con evidencia suficiente;
16. los estados individuales nunca son expuestos al docente con identidad.

---

# 53. Hipótesis a calibrar en piloto

No deben tratarse como científicamente cerradas:

- `mapping_confidence >= 0.60` para elegibilidad;
- `>= 0.85` como mapping principal;
- 2 oportunidades para `solid`;
- 2 errores relacionados para confirmar patrón;
- 2 evidencias posteriores para resolver patrón;
- últimas 5 oportunidades como ventana actual;
- 90 días como límite temporal auxiliar;
- umbral de 5 estudiantes para agregado seguro;
- definición exacta de `HIGH/MEDIUM/LOW`.

La implementación debe parametrizarlas.

---

# 54. Contrato con Recommendation Engine

El Recommendation Engine no debería consumir solamente:

> `visible_state = in_development`

Debe recibir:

```text
visible_state
maturity_state
attention_state
highest_reliably_demonstrated_level
evidence_sufficiency
unresolved_error_patterns
contradictions
next_evidence_need
prerequisite_risk
recent_history
```

Ejemplos:

### Caso A

```text
state = developing
next_evidence_need = higher_cognitive_level
```

Recomendación posible:

> aplicar el concepto.

### Caso B

```text
state = developing
next_evidence_need = unassisted_attempt
```

Recomendación:

> resolver un caso sin pistas.

### Caso C

```text
state = needs_review
error = PO/SM impediments confusion
```

Recomendación:

> escenario específico sobre impedimentos.

### Caso D

```text
state = solid
next_evidence_need = transfer_opportunity
```

Recomendación:

> utilizar la capacidad en un contexto nuevo.

---

# 55. Arquitectura final

```text
CURRICULUM MODEL
        ↓
CAPABILITY
        ↓
EVIDENCE ENGINE
        ↓
EvidenceSignals
        ↓
┌──────────────────────────────┐
│    INTERPRETATION ENGINE     │
│                              │
│ Eligibility                  │
│ Opportunity normalization    │
│ Sufficiency                  │
│ Error patterns               │
│ Contradictions               │
│ Maturity                     │
│ Attention                    │
│ Confidence                   │
│ Next evidence need           │
└──────────────────────────────┘
        ↓
CapabilityInterpretation
        ↓
┌───────────────┬────────────────┐
│               │                │
STUDENT UI   TEACHER AGG.   RECOMMENDATION ENGINE
```

---

# 56. Definición final

> **El Interpretation Engine de Educai transforma evidencia educativa fragmentada en una hipótesis académica actual, trazable y revisable sobre cada capacidad, sin convertir incertidumbre en falsa precisión.**

Su unidad de decisión no es:

> “¿El alumno sabe o no sabe?”

Sino:

> **¿Qué puede sostener la evidencia disponible hoy, qué dificultad aparece, qué sigue siendo incierto y qué tipo de evidencia necesitamos a continuación?**

Esta lógica permite que Educai mantenga simultáneamente:

- simplicidad para el estudiante;
- utilidad para el docente;
- trazabilidad;
- adaptación continua;
- respeto por la incertidumbre;
- capacidad de aprender del propio sistema.