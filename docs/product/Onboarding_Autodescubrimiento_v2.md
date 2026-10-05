# Educai — Especificación del nuevo onboarding de autodescubrimiento profesional

**Versión:** 2.0  
**Tipo de documento:** Product + UX specification  
**Audiencia principal:** IA encargada de diseñar, prototipar o implementar la experiencia  
**Estado:** Propuesta de rediseño  
**Objetivo:** transformar el instrumento actual de autodescubrimiento profesional en una experiencia de onboarding progresiva, clara, motivante y metodológicamente consistente.

---

# 1. Objetivo del onboarding

El onboarding de Educai no debe sentirse como un test vocacional ni como un formulario de 28 preguntas.

Debe sentirse como una conversación estructurada en la que Educai:

1. obtiene contexto mínimo sobre el estudiante;
2. observa evidencia de experiencias y comportamientos reales;
3. presenta situaciones que permiten inferir preferencias;
4. diferencia intereses, aspiraciones, fortalezas autopercibidas y antipreferencias;
5. construye una primera hipótesis profesional;
6. devuelve patrones comprensibles y accionables;
7. propone experiencias concretas para poner esa hipótesis a prueba.

El principio central es:

> **Educai no intenta decirle al estudiante “qué profesión es”. Intenta construir una primera hipótesis sobre qué tipos de problemas, actividades, responsabilidades y contextos parecen movilizarlo hoy, y qué experiencias convendría realizar para comprobarlo.**

El onboarding es únicamente el estado inicial de un perfil profesional longitudinal. El perfil debe evolucionar posteriormente con nueva evidencia proveniente de materias, proyectos, ejercicios, conversaciones con IA y experiencias reales.

---

# 2. Principios de diseño obligatorios

## 2.1. Progressive disclosure

No mostrar todas las preguntas simultáneamente.

La experiencia se divide en etapas conceptuales. Cada pantalla debe pedir una sola decisión principal o un grupo pequeño de decisiones estrechamente relacionadas.

Evitar formularios largos, matrices extensas o páginas con demasiados inputs.

---

## 2.2. Recognition over recall

Cuando sea posible, ofrecer opciones concretas antes que obligar al usuario a redactar.

Patrón preferido:

- opciones visuales;
- selección rápida;
- campo “Otra” o texto libre cuando sea necesario.

Los campos abiertos se reservan principalmente para evidencia cualitativa de alto valor.

---

## 2.3. Reducir priming y consistency bias

No mostrar arquetipos, interpretaciones profesionales ni inferencias antes de terminar las preguntas que alimentan el perfil.

No preguntar demasiado temprano:

> “¿Qué querés ser?”

La hipótesis profesional declarada por el estudiante se captura hacia el final, después de haber obtenido evidencia conductual y situacional.

Esto evita que el usuario intente responder de forma consistente con una identidad previamente declarada.

---

## 2.4. Forced choice cuando mejora la evidencia

En situaciones donde muchas opciones podrían resultar atractivas, limitar deliberadamente la cantidad de elecciones.

Ejemplos:

- elegir exactamente 2;
- elegir hasta 3;
- elegir las dos actividades que más evitaría.

La interfaz debe comunicar visualmente cuántas opciones faltan:

> `Elegiste 1 de 2`

---

## 2.5. Recompensa progresiva sin contaminar la medición

Durante el onboarding sí se puede mostrar progreso y señales de procesamiento, pero no interpretaciones específicas.

Correcto:

> “Ya tenemos suficiente contexto para empezar.”

> “Estamos comparando cómo decidís en distintos escenarios.”

> “Encontramos algunas coincidencias y algunas contradicciones interesantes.”

Incorrecto antes del resultado final:

> “Parecés Estratega.”

> “Tu perfil principal es Integrador.”

---

## 2.6. Labor illusion basada en procesamiento real

Las pantallas de carga deben explicar qué está haciendo Educai.

Nunca usar únicamente:

> “Cargando…”

Usar mensajes como:

> “Comparando tus elecciones en distintos contextos…”

> “Separando lo que te interesa de aquello que simplemente se te da bien…”

> “Buscando patrones que aparecen más de una vez…”

El objetivo es aumentar comprensión del sistema y percepción de personalización, no simular trabajo inexistente.

---

## 2.7. Autonomía

Educai recomienda e interpreta, pero no dicta identidades ni trayectorias.

Evitar:

> “Deberías trabajar en X.”

Usar:

> “Tus respuestas actuales sugieren…”

> “Una hipótesis para explorar…”

> “Podría ser útil probar…”

---

## 2.8. Evitar cristalización de identidad

Nunca presentar un arquetipo como rasgo fijo.

Incorrecto:

> “Sos Estratega.”

Correcto:

> “Hoy aparecen señales consistentes de un patrón Estratega.”

Los resultados deben presentarse como hipótesis actuales, no como identidad definitiva.

---

## 2.9. Mobile first

Todo el flujo debe funcionar correctamente en mobile.

Requisitos:

- botones y cards de gran superficie;
- máximo 2–3 decisiones visuales simultáneas cuando la complejidad sea alta;
- evitar tablas;
- evitar matrices;
- evitar sliders demasiado pequeños;
- evitar textos explicativos largos durante la interacción.

---

# 3. Arquitectura general

El onboarding se organiza en **5 etapas visibles**.

No mostrar `Pregunta 14 de 28`.

Mostrar:

```text
1. Tu contexto
2. Cómo actuás
3. Cómo decidís
4. Qué buscás
5. Tu mapa inicial
```

Representación recomendada:

```text
●────○────○────○────○
1/5
```

o barra equivalente.

El estudiante debe percibir avance por etapas, no por cantidad total de preguntas.

---

# 4. Flujo completo

```text
PANTALLA 0
Promesa
↓
ETAPA 1
Tu contexto
↓
INTERSTITIAL
“Ya tenemos suficiente contexto para empezar”
↓
ETAPA 2
Cómo actuás
↓
ETAPA 3
Cómo decidís
↓
PROCESSING
“Comparando patrones…”
↓
ETAPA 4
Qué buscás
↓
ETAPA 4B
Tu hipótesis profesional actual
↓
PROCESSING FINAL
“Construyendo tu primera hipótesis…”
↓
ETAPA 5
Tu mapa inicial
↓
PRÓXIMA ACCIÓN
Experimentos profesionales
```

---

# 5. Pantalla 0 — Promesa

## Objetivo

Explicar el valor del onboarding antes de pedir información.

## Copy principal

### Descubramos qué tipo de problemas y responsabilidades podrían encajar mejor con vos.

Texto secundario:

> No vamos a decirte “qué deberías ser”. Vamos a construir una primera hipótesis sobre cómo te gusta trabajar y después ayudarte a ponerla a prueba.

Metadata:

> Aproximadamente 10–12 minutos.

CTA:

**Empezar**

## Principios aplicados

- value before effort;
- reducción de incertidumbre;
- autonomía;
- expectativa temporal clara;
- framing no determinista.

---

# 6. Etapa 1 — Tu contexto

## Objetivo

Obtener contexto académico y exposición previa sin generar todavía inferencias profesionales.

## Pantalla 1.1 — Carrera

Pregunta:

### ¿Qué carrera estás estudiando?

Input:

- autocomplete;
- texto manual si no existe coincidencia.

Obligatoria: sí.

Datos:

```json
{
  "academic_context.career": "string"
}
```

---

## Pantalla 1.2 — Etapa académica

Pregunta:

### ¿En qué momento de la carrera estás?

Cards de opción única:

- Recién empezando
- Primera mitad
- Segunda mitad
- Cerca de terminar
- Finalizando tesis/proyecto final
- Otra situación

Obligatoria: sí.

---

## Pantalla 1.3 — Situación actual

Pregunta:

### ¿Qué cosas forman parte de tu vida hoy?

Texto auxiliar:

> Podés elegir varias.

Chips/cards:

- Trabajo en relación de dependencia
- Trabajo de manera independiente
- Tengo un emprendimiento
- Estoy intentando crear un emprendimiento
- Participo en proyectos universitarios
- Participo en investigación
- Participo en voluntariados u organizaciones
- Desarrollo proyectos personales
- Aprendo habilidades por mi cuenta
- Todavía no tuve experiencias fuera de las materias
- Otra

Obligatoria: sí.

No genera scoring directo.

---

## Pantalla 1.4 — Áreas de exposición

Pregunta:

### ¿En qué áreas ya tuviste alguna experiencia?

Chips agrupados visualmente:

**Tecnología y producto**
- Tecnología/software
- Producto
- Diseño
- Datos

**Negocio**
- Negocios
- Marketing/comunicación
- Ventas
- Finanzas

**Gestión**
- Operaciones
- Gestión de proyectos
- Personas/RR.HH.

**Otros**
- Investigación
- Educación
- Impacto social/ambiental
- Emprendimiento
- Otra
- Ninguna todavía

Selección múltiple.

No genera scoring directo.

---

# 7. Interstitial 1

Mostrar después de terminar la etapa de contexto.

Pantalla de 1–2 segundos o avance por CTA.

## Copy

### Ya tenemos suficiente contexto para empezar.

Texto secundario:

> Ahora queremos entender algo más importante: **qué tendés a hacer cuando aparece un problema.**

CTA opcional:

**Continuar**

## Objetivo psicológico

Crear sensación de progreso sin revelar ninguna inferencia.

---

# 8. Etapa 2 — Cómo actuás

Esta etapa prioriza evidencia conductual real.

Debe sentirse más importante que un bloque tradicional de preguntas.

---

## Pantalla 2.1 — Experiencia disfrutada

Pregunta:

### Pensá en algo que realmente hayas disfrutado hacer.

Texto auxiliar:

> Puede ser una materia, trabajo, proyecto, emprendimiento o actividad personal.

Pregunta secundaria:

### ¿Qué estabas haciendo concretamente?

Textarea.

Helper:

> No importa si fue algo “importante”. Nos interesa qué estabas haciendo vos.

Obligatoria: sí.

IA extrae posteriormente:

```json
{
  "activity": "",
  "problem": "",
  "role_assumed": "",
  "context": "",
  "result": "",
  "potential_archetypes": []
}
```

---

## Pantalla 2.2 — Rol espontáneo

Pregunta:

### Cuando nadie reparte los roles, ¿qué terminás haciendo vos?

Texto auxiliar:

> Elegí hasta 3.

Cards:

- **Investigar** — Buscar información y entender el problema.
- **Analizar** — Encontrar patrones en información o datos.
- **Proponer** — Imaginar ideas o alternativas.
- **Decidir** — Definir prioridades o dirección.
- **Construir** — Hacer algo concreto o implementar.
- **Organizar** — Ordenar tareas, responsables y tiempos.
- **Explicar** — Presentar o hacer comprensible el trabajo.
- **Hablar con personas** — Entender usuarios o stakeholders.
- **Facilitar** — Ayudar a que el grupo se entienda y avance.
- **Destrabar** — Detectar problemas y resolverlos.

Obligatoria: sí.

Máximo: 3.

---

## Pantalla 2.3 — Para qué recurren a vos

Pregunta:

### Cuando otras personas recurren a vos, ¿para qué suele ser?

Texto auxiliar:

> Elegí hasta 3.

Cards:

- Entender algo difícil
- Resolver un problema concreto
- Ordenar una situación desorganizada
- Tomar una decisión
- Pensar ideas nuevas
- Explicar algo claramente
- Coordinar personas
- Escuchar y destrabar conflictos
- Analizar información
- Hacer que algo finalmente ocurra
- Conectar ideas que parecían separadas
- Ninguna / todavía no lo sé

---

## Pantalla 2.4 — Logro satisfactorio

Pregunta:

### ¿Qué logro de los últimos dos años te dio más satisfacción?

Pregunta secundaria:

### ¿Qué fue lo que más disfrutaste de conseguirlo?

Textarea.

Obligatoria: no.

Botón secundario:

**Prefiero continuar**

---

# 9. Etapa 3 — Cómo decidís

Objetivo: inferir preferencias mediante elecciones situacionales y dimensiones transversales.

Esta etapa debe sentirse como una secuencia de pequeñas simulaciones, no como un examen.

---

## Pantalla 3.1 — Primera reacción ante un problema

Pregunta:

### Te presentan un problema importante sobre el que sabés poco.

### ¿Qué dos cosas te daría más ganas de hacer primero?

Elegir exactamente 2.

Opciones:

- Investigar hasta comprender bien el problema
- Mirar datos para detectar patrones
- Hablar con las personas afectadas
- Imaginar varias soluciones posibles
- Construir una primera solución para probar
- Comparar caminos y decidir cuál conviene
- Organizar un plan para resolverlo
- Buscar qué está fallando específicamente
- Ver cómo se conecta con otros problemas o sistemas
- Buscar una oportunidad nueva que podría surgir

Mostrar estado:

> Elegiste `0/2`

---

## Pantalla 3.2 — Outputs preferidos

Pregunta:

### Si pudieras elegir, ¿qué resultados te daría más satisfacción producir?

Elegir hasta 3.

Opciones:

- Un producto o sistema funcionando
- Un descubrimiento o explicación nueva
- Una decisión estratégica bien fundamentada
- Un negocio nuevo que encuentra mercado
- Una experiencia que las personas quieran usar
- Un análisis que permita decidir mejor
- Un proyecto complejo ejecutado correctamente
- Una campaña o mensaje que movilice personas
- Una persona que finalmente comprende algo difícil
- Un equipo que empieza a funcionar mejor
- Una oportunidad que nadie había detectado
- Un problema difícil resuelto
- Un equipo alineado detrás de una dirección
- Convertirme en referente de un campo específico
- Una solución que combine disciplinas distintas
- Una transformación importante dentro de una organización o comunidad

---

# 10. Dimensiones transversales

No mostrar una matriz de 10 sliders.

Mostrar microdecisiones independientes.

Puede haber máximo 2 dimensiones por pantalla.

## Componente recomendado

Pregunta:

### ¿Cuál se parece más a vos?

Card izquierda:

> Prefiero entender muy bien antes de actuar.

Escala central de cinco posiciones:

`○ ○ ○ ○ ○`

Card derecha:

> Prefiero construir o probar para aprender.

Guardar valor 1–5.

---

## Dimensiones

### D1 — Comprender ↔ construir
Izquierda:
> Prefiero comprender muy bien antes de actuar.

Derecha:
> Prefiero construir/probar para aprender.

### D2 — Profundizar ↔ conectar
Izquierda:
> Me atrae profundizar mucho en un tema.

Derecha:
> Me atrae conectar muchos temas diferentes.

### D3 — Optimizar ↔ crear
Izquierda:
> Prefiero mejorar algo existente.

Derecha:
> Prefiero crear algo nuevo.

### D4 — Sistemas ↔ personas
Izquierda:
> Me atraen más problemas técnicos o sistémicos.

Derecha:
> Me atraen más problemas humanos o sociales.

### D5 — Expertise ↔ liderazgo
Izquierda:
> Prefiero aportar principalmente desde mi expertise.

Derecha:
> Me atrae coordinar o liderar a otras personas.

### D6 — Resolver ↔ definir dirección
Izquierda:
> Prefiero recibir un problema definido y resolverlo.

Derecha:
> Prefiero participar en definir cuál es el problema y qué dirección tomar.

### D7 — Estructura ↔ incertidumbre
Izquierda:
> Trabajo mejor con estructura y criterios claros.

Derecha:
> Me siento cómodo avanzando con bastante incertidumbre.

### D8 — Individual ↔ colaboración
Izquierda:
> Prefiero trabajar concentrado individualmente.

Derecha:
> Prefiero interacción frecuente con otras personas.

### D9 — Ideación ↔ ejecución
Izquierda:
> Disfruto más pensar posibilidades.

Derecha:
> Disfruto más llevarlas a ejecución.

### D10 — Especialización ↔ integración
Izquierda:
> Me interesa dominar profundamente una disciplina.

Derecha:
> Me interesa combinar varias disciplinas.

---

# 11. Escenarios

Los escenarios deben tener tratamiento visual propio.

Usar encabezado:

> **Imaginá esto**

Luego escenario breve.

No usar códigos Q16, Q17, etc. en la interfaz.

---

## Escenario A — Trabajo práctico universitario

### Imaginá esto

Tu grupo recibe un problema abierto y tiene una semana para presentar una solución. Nadie asignó roles.

### ¿Qué dos responsabilidades elegirías?

- Investigar profundamente el problema
- Entrevistar a personas afectadas
- Proponer y visualizar soluciones
- Construir un prototipo
- Analizar evidencia para decidir
- Definir prioridades y orientar al equipo
- Dividir tareas y asegurar la ejecución
- Preparar una presentación convincente
- Conectar aportes de distintas disciplinas
- Facilitar las discusiones del grupo

Elegir exactamente 2.

---

## Escenario B — Producto nuevo

Un equipo quiere lanzar una aplicación, pero todavía no sabe exactamente qué debería construir.

### ¿Qué dos cosas te atraería más hacer?

- Investigar qué problema vale la pena resolver
- Detectar una oportunidad de negocio
- Hablar con usuarios
- Diseñar la experiencia
- Construir una primera versión
- Analizar métricas y comportamiento
- Definir prioridades
- Coordinar el lanzamiento
- Comunicar y vender la propuesta
- Integrar la solución con el negocio

Elegir exactamente 2.

---

## Escenario C — Problema empresarial

Una organización detecta que sus tiempos de entrega empeoraron mucho.

### ¿Qué parte del desafío preferirías asumir?

- Analizar datos para localizar el problema
- Investigar causas profundas
- Rediseñar el proceso
- Implementar herramientas
- Definir qué cambio tendría mayor impacto
- Coordinar áreas
- Conseguir adopción del cambio
- Diseñar indicadores
- Comunicar el cambio

Elegir exactamente 2.

---

## Escenario D — Proyecto interdisciplinario

Participás en un proyecto con personas de tecnología, negocios, diseño y ciencias sociales.

### ¿Dónde te ubicarías más naturalmente?

- Profundizar en un componente específico
- Traducir entre disciplinas
- Definir qué pregunta debería responder el proyecto
- Crear una solución concreta
- Coordinar el trabajo entre equipos
- Investigar aspectos poco comprendidos
- Trabajar con usuarios o stakeholders
- Presentar el resultado para generar comprensión/adopción

Elegir exactamente 2.

---

## Escenario E — Proyecto con datos

Recibís un conjunto grande de datos sobre un problema real.

### ¿Qué te entusiasmaría más hacer?

- Buscar patrones interesantes
- Formular nuevas preguntas o hipótesis
- Construir una herramienta
- Recomendar una decisión
- Convertir los datos en una historia comprensible
- Combinarlos con información de otras áreas
- Investigar una anomalía inesperada
- Diseñar un sistema para que otros puedan utilizarlos

Elegir exactamente 2.

---

# 12. Processing intermedio

Después de escenarios y dimensiones.

Duración recomendada: 2–4 segundos totales.

Mensajes secuenciales:

1. **Comparando cómo decidís en distintos contextos…**
2. **Buscando patrones que aparecen más de una vez…**
3. **Detectando dónde tus respuestas coinciden y dónde se contradicen…**

No mostrar resultados todavía.

---

# 13. Etapa 4 — Qué buscás

Esta etapa separa antipreferencias, aspiraciones y autopercepción.

---

## Pantalla 4.1 — Antipreferencias

Pregunta:

### Aunque pudieras hacerlo bien, ¿qué preferirías no tener como parte central de tu trabajo?

Texto auxiliar:

> Elegí hasta 5.

Opciones:

- Analizar datos durante largos períodos
- Programar o construir soluciones técnicas
- Investigar profundamente un tema
- Hablar constantemente con clientes o usuarios
- Vender
- Presentar frente a muchas personas
- Gestionar personas
- Coordinar proyectos
- Hacer seguimiento operativo
- Documentar procesos
- Trabajar con mucha incertidumbre
- Realizar tareas altamente estructuradas
- Diseñar experiencias o interfaces
- Enseñar
- Facilitar grupos
- Tomar decisiones con información incompleta
- Profundizar durante años en un área
- Cambiar frecuentemente de tema
- Trabajar individualmente durante mucho tiempo
- Participar constantemente de reuniones

---

## Pantalla 4.2 — Razón de rechazo

Tomar las actividades seleccionadas.

Pregunta:

### De estas actividades, ¿cuáles dos evitarías más?

Elegir hasta 2.

Para cada una preguntar:

### ¿Por qué?

Opciones:

- No me interesa
- La hice y no la disfruté
- Siento que todavía no soy bueno
- Me genera incomodidad, pero casi no la probé
- No tengo suficiente experiencia para saberlo
- Otra razón

Regla conceptual:

```text
“No soy bueno” ≠ “No me interesa”
```

---

## Pantalla 4.3 — Contextos futuros

Pregunta:

### ¿En qué contextos te gustaría experimentar durante los próximos años?

Elegir hasta 3.

- Empresa grande
- Startup
- Crear un emprendimiento propio
- Consultoría
- Investigación
- Academia
- Organización social
- Sector público
- Trabajo independiente
- Estudio/agencia profesional
- Todavía no lo sé

---

## Pantalla 4.4 — Aspiraciones

Pregunta:

### ¿Cuáles de estas situaciones futuras te resultan más atractivas?

Elegir hasta 3.

- Ser muy bueno en una especialidad difícil
- Liderar un equipo
- Crear una empresa o proyecto propio
- Diseñar productos o soluciones nuevas
- Resolver problemas complejos para distintas organizaciones
- Investigar preguntas todavía abiertas
- Tomar decisiones importantes
- Coordinar sistemas y operaciones complejas
- Enseñar o desarrollar personas
- Generar cambios importantes en organizaciones o comunidades
- Trabajar en la intersección entre disciplinas
- Comunicar ideas y movilizar audiencias

---

## Pantalla 4.5 — Tipo de impacto

Pregunta:

### ¿Qué tipo de impacto te gustaría que tuviera tu trabajo?

Elegir hasta 2.

- Que existan cosas nuevas gracias a mi trabajo
- Que se comprendan mejor problemas importantes
- Que se tomen mejores decisiones
- Que organizaciones funcionen mejor
- Que personas aprendan o se desarrollen
- Que grupos trabajen mejor juntos
- Que oportunidades se conviertan en proyectos reales
- Que ideas importantes lleguen a más personas
- Que sistemas u organizaciones cambien
- Todavía no lo sé

---

## Pantalla 4.6 — Fortalezas autopercibidas

Pregunta:

### Independientemente de lo que te gustaría hacer, ¿en cuáles sentís que hoy tenés alguna fortaleza?

Elegir hasta 5.

- Analizar
- Investigar
- Crear ideas
- Construir
- Resolver problemas
- Organizar
- Tomar decisiones
- Comunicar
- Persuadir
- Enseñar
- Escuchar
- Facilitar grupos
- Liderar
- Detectar oportunidades
- Profundizar técnicamente
- Conectar ideas diferentes
- Impulsar cambios
- Todavía no lo sé

No alimentar directamente el score principal.

Guardar como:

```json
{
  "self_perceived_strengths": []
}
```

---

## Pantalla 4.7 — Capacidades a desarrollar

Pregunta:

### ¿Qué capacidades te gustaría desarrollar más durante los próximos años?

Mismas opciones que la pantalla anterior.

Elegir hasta 5.

Guardar como:

```json
{
  "development_interests": []
}
```

---

# 14. Hipótesis profesional declarada

Esta sección aparece **después** de recopilar evidencia conductual.

## Pantalla 4.8

### Antes de mostrarte nuestro análisis…

### Si hoy tuvieras que explicar qué te gustaría hacer profesionalmente, ¿cuál se acerca más?

- Tengo bastante claro el tipo de rol o trabajo que quiero
- Tengo dos o tres caminos concretos
- Sé qué temas o áreas me interesan, pero no qué rol quiero
- Todavía estoy explorando y no tengo una dirección clara

---

## Pantalla 4.9 — Hipótesis

Mostrar si existe alguna dirección.

Pregunta:

### ¿Cuál es hoy tu principal hipótesis profesional?

Placeholder:

> “Producto”, “investigación”, “emprender”, “estoy entre datos y estrategia”…

Textarea corto.

---

## Pantalla 4.10 — Confianza

Pregunta:

### ¿Qué tan seguro estás de que esa dirección realmente te interesa?

Escala 1–5:

1. Es apenas una idea
2. Tengo curiosidad, pero poca evidencia
3. Creo que puede encajar conmigo
4. Tuve experiencias que me hacen pensar que sí
5. Lo probé bastante y quiero seguir desarrollándome ahí

---

## Pantalla 4.11 — Evidencia de esa hipótesis

Pregunta:

### ¿Qué hiciste hasta ahora para comprobarla?

Selección múltiple:

- Trabajé en algo relacionado
- Hice una práctica o pasantía
- Desarrollé un proyecto real
- Hice trabajos universitarios relacionados
- Participé en competencias/hackatones
- Estudié el área por mi cuenta
- Hablé con profesionales
- Observé cómo trabajan personas de ese campo
- Todavía no hice nada concreto

---

## Pantalla 4.12 — Información adicional

Pregunta opcional:

### ¿Hay algo importante sobre el tipo de trabajo, problemas o actividades que te interesan que todavía no hayamos capturado?

Textarea.

CTA secundario:

**No, continuar**

---

# 15. Processing final

Esta pantalla debe funcionar como transición narrativa al resultado.

No utilizar spinner genérico como elemento principal.

## Secuencia de mensajes

### Estado 1

**Comparando tus experiencias con las decisiones que tomaste…**

### Estado 2

**Separando lo que te interesa de aquello que simplemente se te da bien…**

### Estado 3

**Buscando coincidencias entre conducta, preferencias y aspiraciones…**

### Estado 4

**Detectando qué todavía necesitamos poner a prueba…**

### Estado 5

**Construyendo tu primera hipótesis profesional…**

Duración orientativa total:

3–7 segundos, dependiendo del procesamiento real.

---

# 16. Etapa 5 — Tu mapa inicial

El resultado no debe mostrarse como un informe completo de una sola vez.

Usar progressive disclosure.

---

## Resultado 5.1 — Primer insight

Título:

### Encontramos un patrón bastante claro.

Ejemplo:

> Parece que te movilizan especialmente los problemas donde hay que conectar perspectivas diferentes, decidir qué vale la pena hacer y convertir esa dirección en algo concreto.

CTA:

**Ver mi mapa**

---

## Resultado 5.2 — Combinación profesional

Título:

### Tu combinación profesional actual

Ejemplo:

**Integrador + Estratega + Constructor**

Texto obligatorio:

> No es una identidad definitiva. Es una hipótesis construida con la evidencia que tenemos hoy.

Mostrar:

- máximo 3 arquetipos principales;
- máximo 3 secundarios;
- nivel de confianza: baja / media / alta.

No mostrar scores numéricos.

---

## Resultado 5.3 — Cómo tendés a abordar problemas

Mostrar 3–5 patrones concretos.

Ejemplo:

- Buscás entender el panorama completo antes de decidir.
- Te atrae conectar variables de distintas disciplinas.
- Preferís participar en definir qué hacer, no solamente ejecutar.
- Te interesa convertir ideas en iniciativas concretas.

Cada afirmación debería poder vincularse internamente con evidencia del onboarding.

---

## Resultado 5.4 — Fortalezas potenciales

Separar explícitamente:

### Señales observadas

Inferidas de comportamiento y escenarios.

### Lo que vos percibís como fortaleza

Derivado de autopercepción.

No fusionar ambas fuentes.

---

## Resultado 5.5 — Tu hipótesis profesional

Si el estudiante declaró una hipótesis:

Mostrar:

### Vos llegaste pensando:

> “Product Management o emprendimiento.”

Luego:

### Qué dicen tus respuestas sobre esa hipótesis

Clasificación:

- Fuertemente respaldada
- Parcialmente respaldada
- Compatible pero incompleta
- Contradicha por algunas señales
- Todavía no tenemos evidencia suficiente

Nunca decir:

> “No deberías trabajar en X.”

---

## Resultado 5.6 — Tensiones interesantes

Mostrar máximo 3.

Ejemplo:

> Te atrae liderar proyectos, pero aparece poca preferencia por gestión cotidiana de personas. Podría interesarte más liderar desde producto, estrategia o expertise que desde people management.

Las contradicciones deben presentarse como preguntas o hipótesis, no fallas personales.

---

## Resultado 5.7 — Qué podría desgastarte

Basado principalmente en antipreferencias explícitas.

Ejemplo:

> Marcaste poco interés por tareas operativas repetitivas y seguimiento administrativo prolongado.

No inferir desgaste únicamente desde scores bajos.

---

## Resultado 5.8 — Preguntas abiertas

Máximo 3.

Ejemplo:

> Todavía no sabemos si disfrutás la incertidumbre comercial real o solamente la idea de emprender.

> Todavía necesitamos observar cómo te sentís coordinando personas durante varias semanas.

---

# 17. Conversión del onboarding en acción

El onboarding no termina con el perfil.

Debe terminar con:

# Ahora toca comprobarlo.

Texto:

> Este mapa es una hipótesis. La mejor forma de hacerlo más preciso es ponerte en situaciones reales y observar qué ocurre.

Mostrar 3 experimentos profesionales personalizados.

Ejemplo:

### Probar Product Strategy
Liderá la definición y priorización de un problema real.

### Probar investigación
Investigá una pregunta abierta y defendé una hipótesis con evidencia.

### Probar Venture Building
Convertí un problema en una propuesta y validala con usuarios.

CTA principal:

**Empezar mi primer experimento**

CTA secundario:

**Ver mi perfil completo**

---

# 18. Modelo de navegación

## Reglas

- permitir volver atrás;
- preservar respuestas;
- no perder selecciones;
- CTA “Continuar” deshabilitado hasta completar requisitos obligatorios;
- preguntas opcionales permiten “Continuar sin responder”;
- si el usuario cierra, guardar progreso automáticamente;
- al regresar, ofrecer “Continuar donde dejaste”.

---

# 19. Estados visuales requeridos

Cada componente seleccionable debe soportar:

```text
default
hover
selected
disabled
error
completed
recommended
```

Durante onboarding no usar `recommended` para respuestas.

`recommended` se reserva para acciones posteriores al análisis.

---

# 20. Principios de copy

## Usar

- lenguaje directo;
- segunda persona;
- frases cortas;
- ejemplos concretos;
- tono exploratorio;
- lenguaje no determinista.

## Evitar

- lenguaje clínico;
- “test”;
- “diagnóstico”;
- “personalidad”;
- “vocación definitiva”;
- “tipo de persona”;
- afirmaciones absolutas.

### Frases recomendadas

> “Tus respuestas actuales sugieren…”

> “Hoy aparece un patrón…”

> “Una hipótesis para explorar…”

> “Todavía necesitamos evidencia para saber…”

> “Podría ser útil probar…”

---

# 21. Datos y scoring

El rediseño UX no modifica la arquitectura conceptual del instrumento.

Mantener separados:

```text
interés
experiencia
habilidad percibida
evidencia conductual
aspiración
antipreferencia
```

Mantener cuatro canales principales:

```text
B = behavioral evidence
S = scenario choices
P = work preferences
A = aspirations
```

Score interno:

```text
archetype_score = 0.30B + 0.30S + 0.25P + 0.15A
```

Las fortalezas autopercibidas no deben alimentar directamente el score principal.

Las antipreferencias moderan la inferencia, pero no pueden anular por sí solas un patrón positivo.

---

# 22. Reglas metodológicas críticas

## Regla 1

No confundir:

```text
interés ≠ capacidad
```

## Regla 2

No confundir:

```text
capacidad ≠ dirección profesional deseada
```

## Regla 3

Poca exposición implica menor confianza.

## Regla 4

Una aspiración no debe pesar tanto como comportamiento observado.

## Regla 5

Las contradicciones son información útil, no errores del usuario.

## Regla 6

No forzar una separación artificial entre arquetipos cuando varias señales respaldan ambos.

## Regla 7

No usar el perfil para evitar competencias académicas necesarias.

## Regla 8

La personalización posterior debe combinar:

```text
relevancia + exploración
```

---

# 23. Perfil longitudinal

Después del onboarding, el perfil debe poder actualizarse.

Loop conceptual:

```text
hipótesis
↓
experiencia
↓
evidencia
↓
actualización del perfil
↓
nueva hipótesis
↓
nuevo experimento
```

El onboarding genera `profile_version = 1.0`.

Cada nueva experiencia puede modificar:

- arquetipos;
- dimensiones;
- confianza;
- contradicciones;
- intereses;
- antipreferencias;
- fortalezas inferidas;
- experimentos recomendados.

Nunca sobrescribir silenciosamente evidencia anterior.

Mantener historial de cambios.

---

# 24. Criterios de éxito del onboarding

La experiencia es exitosa si:

1. el usuario entiende por qué se le hacen las preguntas;
2. no siente que está completando un test vocacional tradicional;
3. puede terminarla en aproximadamente 10–12 minutos;
4. percibe avance frecuente;
5. no recibe interpretaciones que condicionen respuestas futuras;
6. entiende que el resultado es una hipótesis;
7. recibe al menos un insight que reconoce como específico;
8. termina con una acción concreta para generar nueva evidencia;
9. Educai obtiene suficiente información estructurada para iniciar personalización académica y profesional.

---

# 25. Resumen operativo para una IA implementadora

La implementación debe priorizar este comportamiento:

```text
NO:
28 preguntas → submit → perfil

SÍ:
promesa
→ contexto
→ evidencia real
→ decisiones situacionales
→ preferencias
→ aspiraciones
→ hipótesis declarada
→ procesamiento visible
→ primera hipótesis
→ contradicciones
→ preguntas abiertas
→ experimento recomendado
```

La interfaz debe transmitir durante todo el recorrido:

> **Educai no está clasificándome. Está intentando entender qué patrones aparecen en cómo actúo y qué debería probar después.**

Ese es el principio rector del nuevo onboarding.