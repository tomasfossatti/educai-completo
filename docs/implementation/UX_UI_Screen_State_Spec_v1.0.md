# Educai — UX/UI Screen & State Specification

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Tipo:** Product UX + Frontend State Contract  
**Estado:** Especificación para diseño e implementación  
**Dependencias:** PRD Maestro + Onboarding v2 + Recommendation Engine + Experience Runtime

---

# 0. Propósito

Este documento define qué pantallas existen, qué pregunta responde cada una, qué componentes contiene y cómo se comporta en loading, vacío, error, baja evidencia, permisos y mobile.

Su objetivo es impedir que el frontend tome decisiones de producto mientras se implementa.

> **Educai debe mostrar primero la decisión útil y después permitir profundizar. No debe sentirse como un LMS ni como un dashboard analítico.**

---

# 1. Principios de interfaz

1. Una acción dominante por pantalla.
2. Progressive disclosure.
3. Recognition over recall.
4. Continuar donde quedaste.
5. Progreso expresado como capacidades, no consumo.
6. Explicabilidad disponible sin ocupar el primer plano.
7. Mobile-first en estudiante.
8. Docente: prioridad → evidencia → decisión.
9. Estados de incertidumbre visibles y comprensibles.
10. Ninguna gamificación de urgencia artificial, streaks o FOMO.

---

# 2. Design language base

La implementación debe usar un design system consistente, no styles ad hoc por feature.

Tokens mínimos:

```text
spacing: 4/8/12/16/24/32/48
radius: 8/12/16
breakpoints: mobile/tablet/desktop
typography: title/heading/body/label/meta/code
state semantics: neutral/success/developing/attention/unknown/error
```

No usar únicamente color para representar estado.

Iconografía + texto siempre que el significado sea académico.

---

# 3. Navegación global estudiante

Desktop/mobile:

```text
Inicio
Mis materias
Mi perfil
```

Secundario:

```text
Notificaciones
Tus datos / Configuración
Ayuda
```

No agregar tabs para chat, recursos o dashboard general. Esas capacidades se abren contextualmente.

---

# 4. S-00 — Primer ingreso / routing

## Objetivo

Determinar si el usuario debe continuar onboarding o entrar al producto.

Estados:

### `loading_session`
Skeleton mínimo, no flash de app incorrecta.

### `onboarding_required`
Redirige a `/onboarding`.

### `onboarding_in_progress`
CTA:

> **Continuar donde dejaste**

### `ready`
Redirige a Inicio.

### `account_blocked`
Mensaje claro + soporte.

---

# 5. S-01 — Onboarding: Promesa

Copy principal:

> **Descubramos qué tipo de problemas y responsabilidades podrían encajar mejor con vos.**

Secundario:

> No vamos a decirte qué deberías ser. Vamos a construir una primera hipótesis sobre cómo te gusta trabajar y después ayudarte a ponerla a prueba.

Metadata:

> Aproximadamente 10–12 minutos.

CTA dominante:

**Empezar**

Estado mobile: una columna; CTA sticky inferior si la pantalla excede viewport.

---

# 6. S-02 a S-06 — Onboarding por etapas

Header persistente:

```text
●────○────○────○────○
Tu contexto · 1/5
```

Etapas:

1. Tu contexto
2. Cómo actuás
3. Cómo decidís
4. Qué buscás
5. Tu mapa inicial

Reglas:

- máximo 2–3 decisiones complejas simultáneas en mobile;
- botones/cards grandes;
- autosave después de cada respuesta;
- back preserva respuesta;
- opcionales muestran “Continuar sin responder”;
- no revelar arquetipos antes del resultado;
- forced choice muestra `Elegiste 1 de 2`.

Estados transversales:

`autosaving`, `saved`, `save_failed`, `validation_required`, `offline_temporary`.

En `save_failed` mantener selección local y reintentar; no perder respuesta.

---

# 7. S-07 — Onboarding processing

No spinner genérico aislado.

Mensajes secuenciales reales:

> Comparando tus experiencias con las decisiones que tomaste…

> Separando lo que te interesa de aquello que simplemente se te da bien…

> Detectando qué todavía necesitamos poner a prueba…

Timeout UX: si el proceso tarda más de ~8–10 s, permitir salir y notificar cuando esté listo.

---

# 8. S-08 — Mi mapa inicial

Primero mostrar un insight, no un informe completo.

Bloques progresivos:

- patrón principal;
- combinación profesional actual;
- cómo tendés a abordar problemas;
- señales observadas vs fortalezas autopercibidas;
- hipótesis profesional;
- tensiones;
- preguntas abiertas;
- experiencias para explorar.

Copy obligatorio:

> **No es una identidad definitiva. Es una hipótesis construida con la evidencia que tenemos hoy.**

CTA dominante al terminar onboarding:

**Ir a Educai**

No obligar a ejecutar inmediatamente un experimento profesional separado.

---

# 9. S-10 — Inicio estudiante

Pregunta que responde:

> **¿Qué es lo más útil que puedo hacer ahora?**

Jerarquía:

## A. Tu próximo paso

Card dominante:

```text
Título
razón corta
duración · materia
[Empezar]
¿Por qué me recomendás esto?
```

## B. Continuar donde quedaste

Solo si existe sesión válida.

## C. Otros pendientes

Máximo 3 visibles; resto detrás de “Ver todos”.

---

# 10. Estados de Inicio estudiante

### `normal_recommendation`
Mostrar próxima acción.

### `teacher_required_action`
Badge:

> **Actividad de tu docente**

CTA dominante `Responder` / `Empezar`.

### `resume_priority`
Mostrar `Continuar` como acción dominante si Recommendation Engine así lo decide.

### `assessment_near`
Contexto visible:

> **Parcial en 5 días**

Sin ansiedad artificial; mostrar una única prioridad.

### `no_recommendation`
No inventar actividad.

Mostrar:

> **Estás al día por ahora.**

Opciones secundarias:

`Practicar algo` · `Explorar una materia` · `Avanzar un proyecto`.

### `processing`

> Estamos actualizando tu próximo paso con la evidencia más reciente.

Permitir entrar a materias mientras procesa.

### `error`

> No pudimos actualizar tu recomendación. Tus materias siguen disponibles.

Retry.

---

# 11. Modal / sheet “¿Por qué esto?”

Contenido:

1. Qué observó Educai.
2. Qué todavía falta.
3. Por qué esta acción responde a eso.
4. Sources resumidas, si corresponden.

Acciones:

**Tiene sentido**

**No estoy de acuerdo**

En desacuerdo abrir sheet breve:

```text
¿Qué sentís que Educai está interpretando mal?
[Ya sé hacer esto]
[No quiero trabajarlo ahora]
[La evidencia no representa cómo lo entiendo]
[Otro]
```

No prometer que el estado cambia automáticamente.

---

# 12. S-20 — Mis materias

Lista/cards:

```text
Nombre materia
objetivo actual
estado contextual
próxima acción
```

Acción dominante por card:

`Entrar` o `Continuar`.

Estado sin materias:

> **Todavía no estás en ninguna cátedra.**

CTA: **Unirme a una cátedra**.

---

# 13. S-21 — Unirme a cátedra

Métodos:

- código;
- link deep-link;
- QR.

Estados:

`validating`, `valid`, `already_joined`, `expired_code`, `not_found`, `join_failed`.

No iniciar onboarding otra vez.

---

# 14. S-22 — Materia: Home

Pregunta:

> **¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora?**

Orden:

### Objetivo actual

Capacidad expresada en lenguaje de acción.

### Tu próximo paso

Recomendación de esa cátedra.

### Cómo venís

Máximo 4–6 capacidades relevantes visibles.

Estados:

- Evidencia sólida
- En desarrollo
- Conviene revisar
- Todavía no sabemos

### Lo que ya podés hacer

Capacidades con evidencia sólida.

### Tu recorrido

```text
Comprender ✓
Aplicar ✓
Resolver ●
Transferir ○
```

### Lo que viene

Siguiente objetivo curricular.

### Compartir conversación

Secundario y contextual, no CTA dominante.

---

# 15. S-23 — Detalle de capacidad

Header:

> **Diferenciar Product Owner y Scrum Master**

Mostrar:

- estado actual;
- explicación simple;
- nivel más alto demostrado;
- qué evidencia tenemos;
- qué falta;
- recomendación relacionada.

CTA:

**Trabajar esto**

En `unknown`:

> Todavía no tenemos evidencia suficiente para decir cómo venís en esta capacidad.

No decir “No sabés”.

---

# 16. S-24 — Evidencia del estudiante

Progressive disclosure.

Card por fuente:

```text
fecha
fuente
qué observamos
nivel de ayuda
[Ver fuente]
```

Si la evidencia fue altamente asistida, explicarlo:

> Esta respuesta ocurrió después de varias pistas, por eso la usamos principalmente para orientar práctica y no como demostración independiente.

---

# 17. S-30 — IA integrada

Header contextual:

```text
Marketing · Segmentación
Objetivo: aplicar el concepto a un caso
```

Modos invisibles para usuario pero distintos en comportamiento:

- aprendizaje;
- evidencia.

UI no debe mostrar “modo evaluación”. Puede decir:

> **Ahora probalo por tu cuenta.**

Controles:

- input;
- enviar;
- detener generación;
- nueva explicación;
- volver a materia.

Estados:

`streaming`, `ai_error`, `retryable`, `offline`, `context_changed`.

Nunca perder mensaje del estudiante ante error.

---

# 18. S-31 — Subir conversación externa

Paso 1:

> **¿Estudiaste esto con otra IA?**

Texto para copiar:

> Exportá toda esta conversación en un archivo Markdown, respetando el orden completo de los mensajes e indicando claramente cuáles son míos y cuáles son tuyos. No resumas, elimines ni reescribas ninguna intervención.

CTA: **Subir TXT o MD**.

Paso 2 upload states:

`uploading`, `scanning`, `parsing`.

Paso 3 confirmación:

- conversación detectada;
- roles detectados;
- materia;
- temas probables.

CTA: **Usar como evidencia**.

Errores:

- archivo demasiado grande;
- formato inválido;
- malware/rejected;
- no se distinguen roles;
- conversación parece de otra materia.

En el último caso permitir cambiar materia antes de confirmar.

---

# 19. S-32 — Feedback inmediato post-acción

Mostrar corto:

### Fortaleciste

### Conviene revisar

### Siguiente paso

Acciones:

**Seguir** · **Intentar de nuevo** · `Ver detalle`.

Pregunta profesional opcional cuando aporta valor:

> ¿Cómo te resultó asumir este tipo de responsabilidad?

No mostrar siempre.

---

# 20. S-40 — Proyectos

Lista global, no por materia.

Card:

```text
Proyecto
problema / etapa
personalización: activada/desactivada
```

CTA: **Agregar proyecto**.

Empty:

> Podés agregar un proyecto real para que Educai use situaciones de tu contexto cuando tenga sentido.

No dar la impresión de que es obligatorio.

---

# 21. S-41 — Crear/editar proyecto

Flujo conversacional o formulario corto:

- nombre;
- qué problema intenta resolver;
- objetivo;
- etapa;
- contexto opcional.

Toggle explícito:

> **Usar este proyecto para personalizar actividades**

Default: off hasta consentimiento explícito.

---

# 22. S-50 — Mi perfil

Global.

Jerarquía:

1. Tu combinación actual.
2. Lo que estamos descubriendo.
3. Qué todavía estamos explorando.
4. Caminos para explorar.
5. Ver evolución.
6. Actualizar información.

No mostrar scores de arquetipos.

Copy:

> Tus respuestas y experiencias actuales sugieren…

No:

> Sos…

---

# 23. S-51 — Evolución del perfil

Timeline cualitativo:

```text
Marzo — hipótesis inicial
Abril — apareció señal en actividad X
Mayo — patrón se repitió en otra materia
```

Separar:

- declarado;
- observado;
- inferido.

---

# 24. S-60 — Tus datos / privacidad

Secciones:

- Qué sabe Educai sobre mí
- Qué puede ver mi docente
- Conversaciones compartidas
- Proyectos
- Eliminar evidencia
- Exportar mis datos
- Eliminar cuenta/datos

El copy debe explicar consecuencias antes de borrar:

> Si eliminás esta conversación, Educai dejará de utilizarla y volverá a calcular los estados que dependían de ella.

Confirmación fuerte solo para eliminación destructiva.

---

# 25. Navegación docente

Nivel global:

```text
Mis materias → Materia → Cátedra
```

Dentro de cátedra:

```text
Inicio
Mapa de aprendizaje
Cronograma
Tu aula
Asistente
```

No usar “Feedback” como tab principal; se accede desde Inicio/Tu aula.

---

# 26. T-00 — Selector de materia/cátedra

Cards con:

- materia;
- cátedra;
- período;
- próxima clase;
- setup status.

Estados:

`no_sections`, `setup_required`, `active`, `completed`.

CTA setup:

**Configurar cátedra**.

---

# 27. T-01 — Setup cátedra

Wizard:

1. Información básica.
2. Programa/materiales.
3. Mapa curricular propuesto.
4. Cronograma.
5. Contexto físico.
6. Confirmación.

Debe poder guardar draft y continuar luego.

---

# 28. T-02 — Materiales / procesamiento

Upload cards con estados:

`uploading`, `processing`, `ready`, `warning`, `failed`, `removed`.

Warnings no bloqueantes:

> Pudimos leer el documento, pero algunas páginas tienen poco texto detectable.

No mostrar logs técnicos.

---

# 29. T-03 — “Así entendimos tu materia”

Vista árbol editable:

```text
Módulo
  Unidad
    Tema
      Capacidad
```

Acciones:

**Está correcto**

**Editar**

Edición soporta:

- renombrar;
- mover;
- agregar/eliminar nodo;
- editar capacidad;
- marcar prerequisito.

Activar crea versión.

---

# 30. T-10 — Inicio docente

Header:

```text
Materia
Cátedra
Clase 4 de 11 · 36%
Próximo hito: 1° Parcial
Tema actual: Scrum
```

El porcentaje es avance temporal si se muestra, nunca comprensión.

Bloques:

## Qué necesita tu aula hoy

Máximo 3 prioridades.

## Experiencia recomendada

Una principal.

## Preparar próxima clase

CTA prominente.

## Qué podés mejorar en tu próxima clase

Una recomendación derivada de feedback.

## Perfil general del aula

Resumen agregado secundario.

---

# 31. Estados Inicio docente

### `no_evidence`

> Todavía no tenemos suficiente evidencia del aula.

CTA contextual:

**Crear una experiencia para observar este tema**.

No fingir hallazgos.

### `low_coverage`

> Tenemos señales, pero todavía cubren a pocos estudiantes.

Mostrar n/N; no mostrar porcentaje como representativo si debajo del threshold definido.

### `normal_priorities`

Hasta 3 findings.

### `assessment_near`

Bloque principal:

> **Antes del parcial conviene reforzar…**

### `no_attention_required`

> No aparece una dificultad prioritaria con la evidencia actual.

CTA: preparar próxima clase / avanzar.

### `processing`

Mostrar último mapa válido + badge “Actualizando”.

---

# 32. T-11 — Finding detail

Tres niveles visuales:

### Decidir

Headline + intervención recomendada.

### Entender

Qué dificultad, n/N, cómo se calculó.

### Auditar

- fuentes agregadas;
- evidencia anonimizada segura;
- contradicciones;
- timeline;
- validación docente.

Botones:

**Sí** · **Parcialmente** · **No** · **Todavía no sé**

Validación opcional.

---

# 33. T-20 — Mapa de aprendizaje docente

Árbol/heatmap por:

```text
Módulo → Unidad → Tema → Capacidad
```

Cada row:

- nombre;
- coverage;
- needs-review rate o estado agregado;
- tendencia;
- CTA detail.

Estados de coverage insuficiente explícitos.

No utilizar “83% comprendido”.

---

# 34. T-30 — Cronograma

Timeline de clases e hitos.

Cada clase muestra:

- fecha;
- planificado;
- realizado;
- status;
- actividades asociadas.

Separar visualmente:

> Planificado

> Ocurrió

CTA en clase actual/pasada:

**Cerrar clase**.

---

# 35. T-31 — Cerrar clase

Modal/sheet corto:

- temas efectivamente trabajados;
- actividad realizada;
- qué quedó pendiente;
- comentario opcional.

CTA: **Cerrar clase**.

Después mostrar:

> Estamos actualizando el mapa de aprendizaje y preparando recomendaciones para la próxima clase.

No bloquear docente en pantalla.

---

# 36. T-40 — Tu aula

Agregados únicamente.

Secciones:

- perfil general;
- intereses frecuentes;
- contexto profesional agregado;
- feedback reciente;
- cobertura de evidencia.

Small-cell suppression visible como:

> No mostramos este desglose porque hay muy pocos estudiantes para preservar privacidad.

---

# 37. T-41 — Feedback de estudiantes

Resumen:

### Qué funcionó

### Principal oportunidad

### Otros patrones

### Qué probar en la próxima clase

No mostrar 42 comentarios crudos por defecto.

Puede haber “Ver comentarios anonimizados” si threshold y redaction lo permiten.

---

# 38. T-50 — Asistente Educai

Chat especializado y siempre scoping a cátedra actual.

Quick actions:

- Preparar próxima clase
- Crear una experiencia
- Crear presentación
- Crear ejercicio de cierre
- Revisar material

Header debe indicar cátedra activa para evitar errores de contexto.

Outputs largos deben convertirse en artifacts/cards, no quedar enterrados en chat.

---

# 39. T-51 — Preparar próxima clase

Vista generada con:

- objetivo;
- secuencia;
- minutos;
- materiales;
- experiencia principal;
- cierre;
- rationale.

Acciones:

**Usar plan** · **Editar** · **Crear slides** · **Crear experiencia**.

---

# 40. T-60 — Generación de experiencia

Progreso real:

```text
Diseñando la secuencia…
Preparando la interacción…
Verificando evidencia…
Probando la experiencia…
```

Estados:

`planning`, `generating`, `validating`, `preview_ready`, `failed`.

En `failed`, ofrecer fallback:

> No pudimos generar la simulación interactiva. Podemos crear una versión simple con el mismo objetivo.

---

# 41. T-61 — Preview experiencia

Dos tabs/modos:

**Vista estudiante**

**Configuración**

Mostrar:

- objetivo;
- duración;
- dispositivos;
- qué observará;
- materiales;
- quality warnings no técnicos.

Acciones:

**Usar experiencia** · **Editar** · **Generar otra alternativa**.

---

# 42. T-62 — Lanzar experiencia

Modal:

```text
QR
Código
Link
```

Opciones:

- Lanzar ahora;
- programar.

Cuando open:

> **31/42 ingresaron**

Nunca listar nombres junto a respuestas.

---

# 43. T-63 — Live aggregate

Mostrar:

- ingresaron;
- activos;
- completaron;
- distribución de respuestas autorizada;
- etapa de la experiencia.

No construir surveillance UI.

No mostrar velocidad individual, ranking ni “quién falta”.

---

# 44. T-64 — Resultado experiencia

Después de cerrar:

> **Qué observamos**

Mostrar:

- cobertura;
- patrones;
- dificultad principal;
- cambios versus antes si existe base comparable;
- próxima intervención sugerida.

En procesamiento:

> La experiencia terminó. Estamos procesando la evidencia.

---

# 45. I-00 — Vista institucional mínima

Read-only.

Cards:

- estudiantes activos;
- docentes activos;
- cátedras activas;
- cobertura de evidencia;
- progresión agregada;
- dificultades persistentes;
- intervenciones utilizadas;
- percepción.

Copy de causalidad:

> **Se observó una mejora durante el período.**

No:

> “Educai causó…”

---

# 46. Componentes globales

## AcademicStateBadge

```text
Evidencia sólida
En desarrollo
Conviene revisar
Todavía no sabemos
```

Siempre con label, no solo color.

## EvidenceCoverage

Muestra `n/N` y significado.

## WhyDisclosure

Patrón común para “¿Por qué?”.

## AsyncStatus

Para jobs: processing/success/warn/fail.

## EmptyState

Debe ofrecer próximo paso real, no ilustración vacía sin acción.

## PrivacyNotice

Para pequeñas celdas/anonimización.

---

# 47. Loading strategy

Preferir skeletons de estructura conocida.

No bloquear página completa si solo un panel se actualiza.

Si existe snapshot previo:

> mostrar snapshot + `Actualizando`.

No usar spinners eternos.

---

# 48. Error strategy

Clasificar:

- local/retryable;
- validation;
- permission;
- dependency;
- destructive operation failure.

Cada error debe tener:

- qué pasó en lenguaje humano;
- si algo se perdió o no;
- CTA recuperable.

Ejemplo:

> No pudimos procesar el archivo. El archivo quedó guardado y podés intentar procesarlo otra vez.

---

# 49. Offline / conexión inestable

Estudiante:

- preservar inputs locales;
- guardar drafts cuando vuelve conexión;
- runtime puede usar local state temporal si el formato lo permite.

No prometer offline para IA.

---

# 50. Responsive

## Student

Mobile es referencia primaria.

- bottom nav;
- cards full-width;
- sheets en vez de modal complejo;
- sticky CTA cuando mejora continuidad.

## Teacher

Desktop-first responsive.

Tablet debe soportar clase en vivo.

Mobile puede soportar quick checks y lanzamiento, pero no es requisito que edición curricular compleja sea óptima en teléfono.

---

# 51. Accesibilidad

- teclado;
- focus visible;
- labels;
- semantic headings;
- contrast;
- no depender de color;
- reduced motion;
- captions;
- alternativas a drag/3D cuando sea académicamente equivalente.

---

# 52. Copy system

Usar:

- lenguaje directo;
- español claro;
- verbos concretos;
- incertidumbre explícita;
- segunda persona en estudiante;
- acción concreta en docente.

Evitar:

- “dominado” como absoluto;
- “no entendés”;
- “perfil definitivo”;
- lenguaje clínico;
- jerga técnica de modelos.

---

# 53. Analytics hooks por pantalla

Cada pantalla core debe emitir solo eventos necesarios.

Ejemplos:

```text
student_home_viewed
recommendation_started
why_opened
recommendation_disagreed
course_opened
capability_detail_viewed
external_transcript_started
profile_viewed
teacher_home_viewed
finding_opened
experience_generation_started
experience_launched
class_closed
```

No convertir automáticamente estos eventos en evidencia académica.

---

# 54. Storybook / component contract

Antes de implementar pantallas completas deben existir stories para:

- AcademicStateBadge;
- RecommendationCard;
- CapabilityRow;
- EvidenceItem;
- AsyncStatus;
- EmptyState;
- PrivacyNotice;
- ProgressStepper;
- FindingCard;
- CoverageIndicator;
- ExperienceLaunchPanel.

Cada componente debe tener estados loading/error/disabled cuando aplique.

---

# 55. Criterios de aceptación UX

1. Un estudiante puede entrar y saber qué hacer en menos de unos segundos sin explorar menú.
2. Home nunca necesita un dashboard de gráficos para ser útil.
3. `unknown` nunca se presenta como fracaso.
4. Las recomendaciones pueden explicarse y disentirse.
5. El profesor entiende n/N detrás de porcentajes.
6. El profesor nunca ve identidad asociada a dificultad.
7. Toda operación async tiene estado de progreso y recuperación.
8. Mobile estudiante cubre onboarding, Home, materia, chat, experiencia, feedback y perfil.
9. Las experiencias avanzadas tienen fallback accesible cuando corresponde.
10. El frontend puede implementarse sin inventar estados no contemplados salvo nuevos edge cases documentados.

> **La interfaz de Educai debe convertir complejidad académica en una próxima decisión simple sin esconder la incertidumbre que hace a esa decisión confiable.**
