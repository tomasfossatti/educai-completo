# Educai — START HERE

**Fecha:** 5 de octubre de 2026  
**Estado del proyecto:** producto y arquitectura definidos; implementación por comenzar.  
**Repositorio:** `tomasfossatti/educai-completo`

Este documento existe para que un nuevo chat, desarrollador o agente de código pueda reconstruir rápidamente el estado de Educai sin depender del historial conversacional.

---

# 1. Qué es Educai

Educai es un sistema adaptativo de aprendizaje y diseño pedagógico que convierte experiencias educativas reales en evidencia, interpreta esa evidencia y utiliza el resultado para decidir:

- la siguiente mejor acción del estudiante;
- la siguiente mejor intervención del docente.

Loop central:

```text
experiencia
↓
evidencia
↓
interpretación
↓
recomendación
↓
próxima experiencia
↓
nueva evidencia
```

Estudiante:

> **¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora?**

Docente:

> **¿Dónde estoy en la cursada? → ¿Qué necesita mi aula? → ¿Qué debería hacer en la próxima clase? → ¿Qué puedo mejorar?**

---

# 2. Qué Educai NO es

No convertirlo en:

- LMS completo;
- gradebook;
- sistema de asistencia;
- foro;
- mensajería general;
- biblioteca genérica;
- dashboard sin acción;
- chatbot educativo genérico;
- test vocacional determinista;
- plataforma optimizada para maximizar tiempo de pantalla.

La tesis es:

> **menos fricción → más aprendizaje útil → más evidencia de calidad → mejores próximas decisiones.**

---

# 3. Reglas estructurales que NO deben romperse

## 3.1. Estudiante global / cátedra aislada

El perfil global del estudiante cruza materias para personalización.

La evidencia académica, interpretaciones y estados permanecen aislados por cátedra.

> **El estudiante es transversal. La cátedra es aislada.**

## 3.2. Docente aggregate-only

El docente nunca ve:

- identidad asociada a errores;
- perfiles individuales;
- conversaciones individuales;
- proyectos privados;
- rankings de estudiantes.

El docente sí ve:

- patrones agregados;
- porcentajes;
- evidencia anonimizada;
- feedback anónimo;
- perfil agregado.

## 3.3. Separación epistemológica

Mantener:

```text
Declared ≠ Observed ≠ Inferred ≠ Evaluated
```

Y:

```text
EvidenceEvent
→ EvidenceSignal
→ CapabilityInterpretation
→ Recommendation
```

No fusionar capas.

## 3.4. Progreso por capacidades

No utilizar “% aprendido” como representación principal.

Estados visibles:

- Todavía no sabemos
- En desarrollo
- Evidencia sólida
- Conviene revisar

Internamente Interpretation Engine separa:

```text
maturity_state = unknown | developing | solid
attention_state = none | review
```

## 3.5. Personalización

Se puede adaptar:

- contexto;
- industria;
- proyecto;
- rol;
- narrativa;
- ejemplos;
- dataset;
- formato cuando sea equivalente.

No se puede adaptar hacia abajo:

- objetivo curricular;
- dificultad obligatoria;
- criterio de evaluación;
- evidencia requerida.

## 3.6. Eliminación

Si una fuente se elimina:

```text
fuente
→ evidencia derivada
→ interpretación
→ recomendación
```

debe invalidarse/recalcularse hacia adelante.

## 3.7. Código generado

Claude Code/Codex pueden generar experiencias sofisticadas.

Pero una experiencia generada:

- no accede directamente a DB;
- no recibe secretos;
- no puede leer otros estudiantes/cátedras;
- usa Experience SDK restringido;
- corre desde origen aislado;
- emite eventos instrumentados;
- pasa tests, sandbox y quality gates antes de publicación.

---

# 4. Arquitectura técnica elegida

Decisión v1:

> **core modular monolith + asynchronous workers + PostgreSQL as source of truth + isolated generated-experience runtime**

Unidades de despliegue conceptuales:

```text
web
api
worker
experience-builder
experience-runtime
```

Dominios principales:

- Identity & Access
- Enrollment & Academic Structure
- Curriculum
- Learning Sources
- Evidence
- Interpretation
- Recommendation
- Student Profile & Projects
- Experience
- Runtime Events
- AI Gateway
- Reporting & Analytics

No migrar a microservicios prematuramente.

---

# 5. Documentos canónicos y orden de lectura

## Producto

1. [product/PRD_Maestro_v1.0.md](product/PRD_Maestro_v1.0.md)
2. [product/Onboarding_Autodescubrimiento_v2.md](product/Onboarding_Autodescubrimiento_v2.md)

## Motores

3. [engines/Curriculum_Model_Evidence_Engine_v1.0.md](engines/Curriculum_Model_Evidence_Engine_v1.0.md)
4. [engines/Interpretation_Engine_v1.0.md](engines/Interpretation_Engine_v1.0.md)
5. [engines/Recommendation_Engine_v1.0.md](engines/Recommendation_Engine_v1.0.md)
6. [engines/Experience_Engine_Runtime_v1.0.md](engines/Experience_Engine_Runtime_v1.0.md)

## Arquitectura

7. [architecture/Technical_Architecture_v1.0.md](architecture/Technical_Architecture_v1.0.md)

## Implementación

8. [implementation/Data_Model_Database_Schema_v1.0.md](implementation/Data_Model_Database_Schema_v1.0.md)
9. [implementation/API_Event_Contracts_v1.0.md](implementation/API_Event_Contracts_v1.0.md)
10. [implementation/UX_UI_Screen_State_Spec_v1.0.md](implementation/UX_UI_Screen_State_Spec_v1.0.md)
11. [implementation/Implementation_Backlog_v1.0.md](implementation/Implementation_Backlog_v1.0.md)

---

# 6. Estado actual

## Definido

- tesis de producto;
- onboarding;
- panel estudiante;
- panel docente;
- captura de conversaciones IA;
- modelo curricular;
- Evidence Engine;
- Interpretation Engine;
- Recommendation Engine;
- Experience Engine / Runtime;
- privacidad conceptual;
- institución mínima;
- métricas;
- arquitectura técnica;
- data model;
- API/event contracts;
- UX states;
- implementation backlog.

## Código

Todavía no comenzó la implementación del producto.

El repositorio fue preparado primero como fuente de verdad documental.

---

# 7. Siguiente paso recomendado

No crear más documentación general antes de comenzar.

Seguir el backlog desde Foundations.

Objetivo inicial:

> **conseguir el primer vertical slice end-to-end real.**

Cadena mínima:

```text
crear cátedra
↓
activar currícula
↓
inscribir estudiante
↓
acción/interacción del estudiante
↓
EvidenceEvent / EvidenceSignal
↓
CapabilityInterpretation
↓
Recommendation
↓
mostrar “Tu próximo paso”
```

La infraestructura y modelo académico deben probarse con experiencias simples antes de simulaciones 3D o formatos avanzados.

---

# 8. Documentos que aún pueden desarrollarse en paralelo

No bloquean el comienzo de Foundations / Academic Model:

- AI Gateway & Prompt Architecture;
- Privacy & Security Specification formal;
- Experience SDK Specification;
- Evaluation & Test Specification;
- Operational / Deployment Runbook.

Deben cerrarse antes de las fases que dependen directamente de ellos y, en particular, antes del primer piloto con datos reales.

---

# 9. Regla para un nuevo chat

Al continuar desde otro chat:

1. indicar el repositorio `tomasfossatti/educai-completo`;
2. pedir que lea este archivo;
3. pedir que lea el backlog y los specs del módulo que vaya a implementar;
4. no volver a rediseñar el producto salvo que aparezca una contradicción real;
5. trabajar por story/vertical slice;
6. escribir código + tests + documentación necesaria;
7. preservar contracts, lineage, privacidad y aislamiento por cátedra.

Prompt sugerido:

> **Trabajá sobre el repositorio `tomasfossatti/educai-completo`. Leé primero `docs/00-START-HERE.md` y luego `docs/implementation/Implementation_Backlog_v1.0.md`. Tomá los documentos versionados del repo como fuente de verdad. Empezá por la siguiente story P0 no implementada, respetando Technical Architecture, Data Model, API Contracts y UX Spec. No redefinas decisiones de producto salvo contradicción explícita.**
