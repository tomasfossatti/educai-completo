# EDUCAI — PRD MAESTRO

**Versión:** 1.0  
**Fecha:** 5 de octubre de 2026  
**Estado:** Producto definido / listo para especificación técnica y construcción  
**Alcance:** Producto completo de estudiante + docente + capa institucional mínima + motores de evidencia, interpretación, recomendación y experiencias  
**Documento rector:** Este PRD consolida las decisiones de producto definidas hasta la fecha. Cuando una regla aparece como **Hipótesis a calibrar**, debe implementarse con instrumentación suficiente para revisarla con evidencia real de uso.

---

# 0. Resumen ejecutivo

Educai es un sistema adaptativo de aprendizaje y diseño pedagógico que convierte experiencias educativas reales en evidencia, interpreta esa evidencia y utiliza el resultado para decidir cuál debería ser la siguiente mejor acción del estudiante y la siguiente mejor intervención del docente.

Educai no se diseña como un LMS, un chatbot genérico, un dashboard analítico ni un test vocacional. Su unidad central es el **loop de aprendizaje**:

> **experiencia → evidencia → interpretación → feedback/decisión → próxima experiencia → nueva evidencia**

El producto tiene dos experiencias principales:

**Estudiante**

> **¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora?**

Educai reduce la fricción de estudiar, hace visible el progreso en términos de capacidades demostradas y recomienda una sola próxima acción prioritaria. A la vez, mantiene un perfil global y longitudinal de autoconocimiento profesional que se inicia con un onboarding realizado una sola vez y se actualiza con experiencias reales a lo largo de todas las materias.

**Docente**

> **¿Dónde estoy en la cursada? → ¿Qué necesita mi aula? → ¿Qué debería hacer en la próxima clase? → ¿Qué puedo mejorar?**

Educai transforma evidencia anónima del aula en prioridades pedagógicas, recomienda experiencias de aprendizaje, ayuda a preparar clases, genera materiales y simulaciones, permite lanzar experiencias digitales y vuelve a observar qué ocurrió para actualizar sus recomendaciones.

La institución no necesita, en primera instancia, un producto operativo complejo. Recibe una capa mínima de impacto agregado que responde principalmente:

> **¿Está mejorando el aprendizaje mientras se utiliza Educai?**

---

# 1. Problema

## 1.1. Problema del estudiante

Los estudiantes ya utilizan IA, materiales, proyectos y actividades para aprender, pero el proceso suele quedar fragmentado.

Pueden pasar horas:

- conversando con una IA;
- leyendo;
- resolviendo;
- corrigiendo;
- investigando;
- trabajando en proyectos;

sin tener una respuesta clara a:

- qué aprendieron realmente;
- qué capacidad demostraron;
- qué todavía no comprenden;
- cuál debería ser su próximo paso;
- cómo se conecta lo aprendido con problemas reales;
- qué están descubriendo sobre sus propias preferencias y capacidades.

Los sistemas tradicionales suelen representar el avance como contenido completado. Educai busca representar **capacidades respaldadas por evidencia**.

---

## 1.2. Problema del docente

El docente tiene información limitada y tardía sobre cómo está aprendiendo su aula.

Con frecuencia descubre las dificultades:

- durante un examen;
- mediante preguntas aisladas;
- por intuición;
- después de varias clases;
- cuando ya avanzó a otro contenido.

Aunque disponga de datos, convertirlos en una decisión concreta requiere tiempo:

- ¿qué tema priorizar?
- ¿qué error es recurrente?
- ¿qué actividad conviene?
- ¿qué explicación debería modificar?
- ¿qué vale la pena hacer antes de un parcial?

Educai debe reducir la distancia entre:

> **“hay señales de una dificultad”**

y

> **“sé qué hacer en la próxima clase”.**

---

## 1.3. Problema institucional

Las instituciones invierten en docencia, contenidos y tecnología, pero suelen tener poca evidencia continua sobre:

- qué capacidades se están desarrollando;
- dónde existen dificultades persistentes;
- si las intervenciones docentes están asociadas a una mejora posterior;
- qué tan amplia es la cobertura real de evidencia;
- si una tecnología educativa está aportando valor observable.

Educai debe ofrecer una señal institucional agregada sin convertirse en un sistema de vigilancia individual.

---

# 2. Visión de producto

> **Educai observa cómo aprende cada estudiante, convierte esa evidencia en decisiones y diseña la próxima mejor experiencia para que estudiante y docente sepan qué hacer a continuación.**

La visión de largo plazo es que Educai funcione como una capa de inteligencia pedagógica longitudinal:

- entiende la currícula;
- conoce el contexto del estudiante;
- observa interacciones educativas;
- identifica capacidades y dificultades;
- recomienda microacciones;
- diseña experiencias;
- captura nueva evidencia;
- actualiza el modelo;
- ayuda al docente a intervenir;
- muestra al estudiante su progreso real;
- permite a la institución evaluar valor agregado en aprendizaje.

---

# 3. No objetivos

Educai no busca convertirse en:

- un LMS completo;
- un sistema de asistencia;
- un gradebook;
- un sistema administrativo universitario;
- un repositorio genérico de archivos;
- una plataforma de mensajería;
- un foro;
- un ranking de alumnos;
- un sistema de vigilancia;
- un test vocacional definitivo;
- una evaluación psicométrica;
- un chatbot genérico;
- un generador indiscriminado de actividades;
- una plataforma optimizada para maximizar tiempo de pantalla.

La métrica de éxito no es cuánto tiempo permanece el usuario dentro de Educai, sino cuánto aprendizaje útil y cuánta evidencia de calidad se generan con la menor fricción razonable.

---

# 4. Principios de producto

## 4.1. Una acción dominante

Cada pantalla debe tener una acción principal evidente.

En la Home del estudiante:

> **Tu próximo paso**

En la Home del docente:

> **Qué necesita tu aula hoy**

---

## 4.2. Progressive disclosure

No mostrar simultáneamente:

- perfil;
- currícula completa;
- capacidades;
- proyectos;
- recomendaciones;
- historial;
- evidencia detallada.

Mostrar primero lo necesario para decidir y permitir profundizar.

---

## 4.3. Defaults inteligentes

Educai debe recuperar contexto y reducir decisiones repetidas.

Ejemplos:

- continuar donde el estudiante quedó;
- abrir la cátedra reciente;
- sugerir el próximo paso;
- precargar el contexto de la próxima clase al asistente docente.

---

## 4.4. Recognition over recall

Preferir:

> **Seguir estudiando Elasticidad**

sobre:

> **Elegir materia → unidad → tema → actividad**

El usuario no debe reconstruir mentalmente el estado que Educai ya conoce.

---

## 4.5. Progreso basado en evidencia

No representar aprendizaje principalmente como:

> “72% de contenido completado”.

Representarlo como:

> **Ya podés hacer X.**

> **Estás desarrollando Y.**

> **Conviene revisar Z.**

---

## 4.6. Feedback rápido

Siempre que una interacción permita feedback útil, cerrar el loop rápidamente:

> **acción → feedback → corrección → nuevo intento**

---

## 4.7. Personalización con agencia

Educai recomienda primero.

El usuario puede:

- elegir otra acción;
- pedir una explicación;
- disentir;
- corregir contexto;
- editar una propuesta.

> **Educai recomienda. La persona decide.**

---

## 4.8. Explicabilidad

Toda recomendación importante debe poder responder:

> **¿Por qué me recomendás esto?**

Toda interpretación docente importante debe poder responder:

> **¿Por qué Educai detectó esto?**

---

## 4.9. Microcompromisos

Transformar metas grandes en acciones pequeñas y observables.

No:

> “Estudiá Marketing”.

Sí:

> “Compará estas tres segmentaciones y elegí cuál priorizarías.”

---

## 4.10. Relevancia + exploración

La personalización no debe encerrar al estudiante dentro de lo que ya le gusta.

Debe combinar:

> **relevancia + exploración**

---

# 5. Usuarios y roles

## 5.1. Estudiante

Necesita:

- saber qué hacer ahora;
- recibir feedback;
- percibir progreso;
- practicar;
- comprender errores;
- transferir conocimiento;
- conectar lo académico con problemas reales;
- construir un perfil longitudinal de autoconocimiento.

---

## 5.2. Docente

Necesita:

- entender qué necesita el aula;
- preparar una mejor próxima clase;
- diseñar experiencias;
- utilizar evidencia sin transformarse en analista de datos;
- comprender por qué Educai llega a una conclusión;
- mejorar su práctica a partir de feedback anónimo.

---

## 5.3. Institución

Necesita, inicialmente:

- evaluar adopción;
- evaluar cobertura de evidencia;
- observar progresión agregada de capacidades;
- detectar dificultades curriculares persistentes;
- observar si las intervenciones se asocian a mejora posterior;
- conocer utilidad percibida.

No necesita un panel complejo en el MVP.

---

# 6. Arquitectura conceptual

## 6.1. Regla fundamental

> **El estudiante es transversal. La cátedra es aislada.**

---

## 6.2. Capa global del estudiante

Acompaña al estudiante a través de todas sus materias.

Contiene:

- contexto académico;
- experiencias;
- intereses;
- preferencias;
- antipreferencias;
- aspiraciones;
- fortalezas autopercibidas;
- capacidades a desarrollar;
- hipótesis profesional;
- arquetipos actuales;
- dimensiones;
- contradicciones;
- incertidumbres;
- proyectos;
- historial de evolución;
- configuración de privacidad.

---

## 6.3. Capa académica por cátedra

Cada cátedra es independiente.

Contiene:

- materia;
- programa;
- materiales;
- mapa curricular;
- capacidades;
- cronograma;
- clases;
- estudiantes;
- actividades;
- experiencias;
- evidencia;
- estados de aprendizaje;
- feedback;
- recomendaciones;
- historial del asistente docente.

No se mezclan automáticamente datos pedagógicos entre cátedras.

> **Materia organiza. Cátedra contiene.**

---

# 7. Onboarding global del estudiante

## 7.1. Regla

El onboarding de autoconocimiento se realiza **una sola vez por estudiante**.

No se repite cuando el estudiante:

- se inscribe en una nueva materia;
- cambia de cátedra;
- inicia un nuevo semestre.

Genera `profile_version = 1.0`.

---

## 7.2. Objetivo

No debe sentirse como un test vocacional.

Debe construir:

> **una primera hipótesis sobre qué tipos de problemas, actividades, responsabilidades y contextos parecen movilizar al estudiante hoy y qué convendría probar para comprobarlo.**

---

## 7.3. Etapas visibles

1. **Tu contexto**
2. **Cómo actuás**
3. **Cómo decidís**
4. **Qué buscás**
5. **Tu mapa inicial**

No mostrar:

> Pregunta 14 de 28.

Mostrar progreso por etapas.

---

## 7.4. Principios del onboarding

- progressive disclosure;
- mobile first;
- recognition over recall;
- forced choice cuando aporta evidencia;
- autoguardado;
- continuar donde quedó;
- no mostrar inferencias antes del final;
- preguntar la hipótesis profesional hacia el final;
- no confundir interés, capacidad y aspiración;
- lenguaje exploratorio;
- no cristalizar identidades.

---

## 7.5. Resultado

Debe mostrar progresivamente:

- primer insight;
- combinación profesional actual;
- cómo tiende a abordar problemas;
- señales observadas;
- fortalezas autopercibidas;
- hipótesis profesional;
- tensiones;
- posibles desgastes;
- preguntas abiertas;
- experimentos para explorar.

Nunca:

> “Sos X.”

Sí:

> “Hoy aparecen señales consistentes de X.”

---

## 7.6. Evolución posterior

El onboarding no se repite.

El perfil se actualiza mediante:

> **hipótesis → experiencia → evidencia → actualización → nueva hipótesis**

El estudiante puede actualizar información objetiva desde **Mi perfil**, pero no necesita rehacer el instrumento.

---

# 8. Panel del estudiante

## 8.1. Navegación principal

**Inicio · Mis materias · Mi perfil**

Secundario:

- Notificaciones
- Configuración / Tus datos

---

## 8.2. Home

La Home responde:

> **¿Qué es lo más útil que puedo hacer ahora?**

Orden visual:

1. Tu próximo paso.
2. Continuar donde quedaste.
3. Otros pendientes.

No mostrar por defecto:

- mapa curricular completo;
- perfil profesional completo;
- todas las métricas;
- historial extenso.

---

## 8.3. Tu próximo paso

Una sola recomendación dominante.

Ejemplo:

> **Aplicá segmentación a Educai**
>
> Ya comprendés el concepto, pero todavía no tenemos suficiente evidencia de que puedas aplicarlo correctamente.
>
> 15 min · Marketing
>
> **Empezar**

Acción secundaria:

> **¿Por qué me recomendás esto?**

Alternativa:

> **Quiero hacer otra cosa**

Opciones:

- Entender mejor
- Practicar
- Probarme
- Profundizar
- Avanzar un proyecto

---

## 8.4. Continuar donde quedaste

Educai mantiene el estado de una sesión.

Ejemplo:

> **Continuar aplicación de segmentación a Educai**

No obliga al alumno a navegar nuevamente hacia:

> materia → unidad → tema.

---

## 8.5. Mis materias

Lista simple.

Cada materia muestra:

- objetivo actual;
- estado;
- próxima acción.

Dentro de una materia, la jerarquía es:

> **¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora?**

---

## 8.6. Objetivo actual

Expresado como capacidad.

No:

> “Unidad 2: Scrum.”

Sí:

> **Aplicar correctamente los roles de Scrum en situaciones reales.**

Cada unidad debe poder expresar:

> **Al terminar vas a poder...**

con 2–4 capacidades concretas.

---

## 8.7. Recorrido cognitivo

Modelo general:

> **Comprender → Aplicar → Resolver → Transferir**

No implica que todas las capacidades necesiten exactamente cuatro pantallas, sino que Educai diferencia niveles de demanda cognitiva.

---

## 8.8. Cómo venís

Estados visibles:

- **Evidencia sólida**
- **En desarrollo**
- **Conviene revisar**
- **Todavía no sabemos**

Ejemplo:

> Framework Scrum — Evidencia sólida  
> Roles Scrum — En desarrollo  
> PO vs. Scrum Master — Conviene revisar  
> Retrospectiva — Todavía no sabemos

---

## 8.9. Lo que ya podés hacer

Es uno de los componentes centrales.

Ejemplo:

> ✓ Explicar cómo funciona un Sprint  
> ✓ Diferenciar Product Backlog y Sprint Backlog  
> ✓ Identificar responsabilidades del Product Owner

Cada capacidad puede abrir:

> **Ver evidencia**

La visión de largo plazo es un historial de capacidades demostradas, no un historial de contenido consumido.

---

## 8.10. Microacciones

La unidad operativa debe ser pequeña.

Ejemplos:

- responder tres preguntas;
- comparar alternativas;
- explicar con palabras propias;
- aplicar a un caso;
- tomar una decisión;
- corregir un error;
- defender un supuesto;
- transferir a una situación nueva.

Toda microacción importante debería poder generar evidencia.

---

# 9. IA integrada del estudiante

## 9.1. Función

El estudiante puede estudiar conversando con la IA integrada de Educai.

La IA conoce:

- cátedra;
- currícula;
- materiales permitidos;
- estado académico;
- contexto personal relevante;
- proyecto cuando corresponda;
- historial reciente.

---

## 9.2. Principio

El chat no debe ser un destino genérico que obligue al estudiante a inventar qué pedir.

Preferentemente se abre contextualizado desde:

- Tu próximo paso;
- Entender mejor;
- Practicar;
- Profundizar;
- Aplicar a mi proyecto.

---

## 9.3. Evidencia

Educai registra:

- mensajes del estudiante;
- ayudas de la IA;
- correcciones;
- intentos;
- cambios de explicación;
- respuestas posteriores.

La respuesta de la IA **no es evidencia de aprendizaje del alumno**.

La evidencia proviene de lo que el estudiante:

- explica;
- decide;
- resuelve;
- produce;
- corrige.

---

# 10. Importación de conversaciones externas

## 10.1. Formatos MVP

- `.txt`
- `.md`

---

## 10.2. Flujo

Dentro de una materia:

> **¿Estudiaste esto con otra IA?**

**Subir conversación**

El alumno puede pedir a la IA externa:

> **“Exportá toda esta conversación en un archivo Markdown, respetando el orden completo de los mensajes e indicando claramente cuáles son míos y cuáles son tuyos. No resumas, elimines ni reescribas ninguna intervención.”**

Educai:

1. recibe archivo;
2. identifica turnos;
3. detecta materia/temas;
4. valida parseo;
5. muestra un resumen de importación;
6. el estudiante confirma;
7. se generan objetos de evidencia.

---

## 10.3. Procedencia

Registrar:

`source_type = external_ai_transcript`

`provenance = user_uploaded`

Una conversación importada tiene menor certeza de procedencia que una interacción observada directamente dentro de Educai.

No debe considerarse inválida, pero la procedencia afecta la fuerza de evidencia.

---

# 11. Modelo de evidencia

## 11.1. Principio

Separar estrictamente:

> **EVIDENCIA → SEÑAL → INTERPRETACIÓN**

Una evidencia no debe afirmar:

> “El estudiante entiende Scrum.”

Debe registrar:

> “En esta situación, el estudiante hizo/dijo X.”

---

## 11.2. EvidenceEvent

Campos conceptuales:

- `evidence_id`
- `student_id`
- `course_section_id`
- `source_type`
- `source_id`
- `timestamp`
- `curriculum_node_ids`
- `capability_ids`
- `task_context`
- `student_action`
- `expected_behavior`
- `cognitive_level`
- `signal_direction`
- `evidence_strength`
- `provenance_quality`
- `assistance_level`
- `raw_source_pointer`
- `interpretation_version`
- `metadata`

---

## 11.3. Fuentes académicas

Pueden generar evidencia académica:

- conversación con IA integrada;
- conversación externa importada;
- simulación;
- escenario de decisión;
- actividad digital;
- ejercicio estructurado;
- exit ticket;
- proyecto o artefacto entregado;
- ejercicio de recuperación;
- reflexión evaluable cuando exige reconstrucción de conocimiento.

---

## 11.4. Fuentes contextuales

No actualizan directamente el estado académico:

- opinión del estudiante sobre una clase;
- autopercepción;
- preferencia;
- satisfacción;
- perfil profesional;
- observación docente general;
- metadata de uso.

Pueden ayudar a interpretar o personalizar, pero no equivalen a aprendizaje demostrado.

---

## 11.5. Nivel cognitivo

Taxonomía operativa:

1. **Reconocer**
2. **Explicar**
3. **Aplicar**
4. **Resolver**
5. **Transferir**

Una evidencia de nivel superior puede aportar información sobre niveles inferiores, pero no siempre los reemplaza automáticamente.

---

## 11.6. Dirección de señal

- **Positiva**
- **Negativa**
- **Ambigua**
- **Contradictoria**

La contradicción se conserva.

Nunca se elimina una evidencia anterior para que el modelo “quede prolijo”.

---

## 11.7. Fuerza de evidencia

Evaluar internamente al menos:

- directitud;
- demanda cognitiva;
- independencia;
- consistencia;
- procedencia;
- asistencia recibida.

---

## 11.8. Nivel de asistencia

Registrar:

- `none`
- `light_prompting`
- `scaffolded`
- `answer_revealed`
- `unknown`

Una respuesta correcta después de que la IA reveló prácticamente la solución no debe contar igual que una resolución independiente.

---

## 11.9. Oportunidad independiente

No contar cada click como una evidencia distinta.

Una “oportunidad” es una ocasión razonablemente independiente de demostrar una capacidad.

Una simulación rica puede contener varias oportunidades si presenta escenarios distintos y comparables.

---

# 12. Unidad central de interpretación: capacidad

Educai no interpreta únicamente temas.

Ejemplo:

**Tema:** Roles Scrum

**Capacidades:**

- explicar responsabilidades;
- distinguir Product Owner y Scrum Master;
- asignar responsabilidades en un caso;
- resolver situaciones ambiguas;
- transferir el criterio a un contexto nuevo.

Esto permite afirmar:

> **Comprensión conceptual sólida, aplicación todavía en desarrollo.**

en lugar de:

> **Scrum 63%.**

---

# 13. Motor de interpretación

## 13.1. Pipeline

1. **Capturar**  
   Qué hizo o dijo el estudiante.

2. **Clasificar**  
   A qué tema y capacidad corresponde.

3. **Interpretar la acción**  
   Qué señal aporta.

4. **Estimar fuerza**  
   Qué tan informativa es.

5. **Comparar**  
   Qué otras evidencias existen.

6. **Detectar patrones**  
   Consistencia, dificultad, contradicción.

7. **Actualizar estado**  
   Qué sabemos ahora sobre la capacidad.

8. **Decidir**  
   Qué acción puede generar más aprendizaje o mejor evidencia.

---

## 13.2. Principios

- una respuesta incorrecta no equivale a “no entiende”;
- una respuesta correcta no equivale a “domina”;
- múltiples respuestas dentro del mismo ejercicio no siempre son independientes;
- evidencia altamente asistida pesa menos;
- evidencia aplicada pesa más que autodeclaración;
- las contradicciones deben producir recomendaciones específicas;
- el motor debe guardar trazabilidad de cada estado.

---

# 14. Estados académicos

## 14.1. Estados visibles

### Todavía no sabemos

No existe evidencia suficiente.

### En desarrollo

Existen señales útiles, pero todavía son parciales, limitadas o inconsistentes.

### Evidencia sólida

La capacidad fue demostrada de manera consistente en oportunidades suficientes y con demanda cognitiva adecuada.

### Conviene revisar

Existe una dificultad recurrente, una concepción errónea importante o una señal que puede bloquear aprendizajes posteriores.

---

## 14.2. Reglas iniciales del MVP

**Hipótesis a calibrar con uso real.**

### Todavía no sabemos

- no hay evidencia relevante; o
- existe solamente evidencia muy débil o altamente asistida.

### En desarrollo

- una evidencia positiva fuerte; o
- varias positivas de nivel bajo; o
- mezcla de señales sin patrón suficientemente claro.

### Evidencia sólida

Default inicial:

- al menos dos oportunidades independientes positivas;
- al menos una de nivel Aplicar o superior;
- consistencia mayoritaria;
- al menos una evidencia con baja asistencia;
- sin una dificultad recurrente crítica no resuelta.

### Conviene revisar

Default inicial:

- la misma dificultad aparece en dos oportunidades independientes; o
- una experiencia rica muestra repetidamente el mismo error; o
- aparece una concepción errónea central con efecto sobre capacidades posteriores.

---

## 14.3. Regla de estabilidad

Una falla aislada no debe destruir automáticamente un estado de evidencia sólida.

Cuando aparece una dificultad de mayor nivel, preferir:

> **Evidencia sólida en aplicación básica + conviene revisar transferencia**

mediante capacidades separadas.

---

# 15. Contradicciones

Caso:

- conversación: explica bien PO vs. SM;
- simulación: asigna mal responsabilidades en 3 de 5 casos.

Interpretación:

> **Comprensión declarativa aparentemente correcta; dificultad de aplicación.**

Próxima acción:

> escenarios y decisiones

No:

> repetir definición.

Las contradicciones son uno de los insumos más valiosos para personalizar.

---

# 16. Motor de recomendación del estudiante

## 16.1. Inputs

- estado académico;
- objetivos curriculares;
- prerrequisitos;
- dificultad detectada;
- nivel cognitivo alcanzado;
- cercanía de evaluaciones;
- historial reciente;
- actividad interrumpida;
- perfil global;
- proyectos;
- preferencias de personalización;
- tiempo/contexto disponible;
- experiencias lanzadas por el docente.

---

## 16.2. Prioridad conceptual

Orden por defecto:

1. actividad docente activa con prioridad temporal;
2. continuar una sesión reciente relevante;
3. corregir dificultad bloqueante;
4. demostrar una capacidad para la que falta evidencia;
5. avanzar hacia el siguiente objetivo curricular;
6. transferir o profundizar.

---

## 16.3. Output

Una sola:

> **Próxima mejor acción**

Debe incluir:

- qué hacer;
- por qué;
- duración estimada;
- materia;
- resultado esperado.

---

## 16.4. Explicabilidad

El estudiante puede abrir:

> **¿Por qué esto?**

Ejemplo:

> Diferenciaste correctamente TAM y SAM.  
> Confundiste SAM y SOM en dos situaciones.  
> Todavía no lo aplicaste a un caso propio.
>
> Por eso te proponemos aplicarlo a tu proyecto.

Acciones:

- Tiene sentido
- No estoy de acuerdo

El desacuerdo genera información para recalibrar.

---

# 17. Feedback del estudiante después de una acción

Mostrar primero:

### Fortaleciste

Qué capacidad mostró señales positivas.

### Conviene revisar

Qué dificultad permanece.

### Siguiente paso

Una recomendación corta.

Acciones:

- Seguir
- Intentar de nuevo
- Ver detalle

Cuando aporta valor al perfil profesional:

> **¿Cómo te resultó asumir este tipo de responsabilidad?**

- Me gustó mucho
- Me interesó
- Neutral
- No me gustó

No confundir esta respuesta con capacidad académica.

---

# 18. Mi perfil

## 18.1. Rol

Es global y transversal.

No debe dominar la experiencia académica diaria.

---

## 18.2. Contenido

- combinación profesional actual;
- qué parece movilizar al estudiante;
- cómo tiende a abordar problemas;
- señales observadas;
- fortalezas autopercibidas;
- intereses;
- hipótesis profesional;
- tensiones;
- preguntas abiertas;
- caminos para explorar;
- evolución temporal.

---

## 18.3. Evolución

Ejemplo:

> **Marzo**  
> Estrategia aparecía como hipótesis.
>
> **Abril**  
> En tres actividades elegiste responsabilidades de priorización.
>
> **Mayo**  
> La señal también apareció en otra materia.

Nunca sobrescribir silenciosamente el pasado.

---

# 19. Proyectos del estudiante

## 19.1. Naturaleza

Los proyectos son globales al estudiante.

Ejemplos:

- emprendimiento;
- proyecto universitario;
- investigación;
- proyecto personal;
- iniciativa profesional.

---

## 19.2. Objeto Project

Campos:

- `project_id`
- `student_id`
- `name`
- `description`
- `problem_statement`
- `objective`
- `stage`
- `industry`
- `target_users`
- `links`
- `documents`
- `created_at`
- `updated_at`
- `personalization_enabled`
- `sharing_policy`

---

## 19.3. Uso

Una materia puede utilizar un proyecto como contexto.

Ejemplo:

Marketing:

> segmentar usuarios de Educai.

Estadística:

> analizar datos de adopción.

Finanzas:

> construir economía unitaria.

Gestión:

> diseñar una estructura de proyecto.

---

## 19.4. Regla académica

> **El proyecto adapta el contexto, no reemplaza el objetivo curricular.**

---

## 19.5. Privacidad

Por defecto:

> **privado para el estudiante y utilizable por Educai según la configuración de personalización.**

El docente no obtiene acceso al proyecto completo.

Si una actividad requiere una entrega:

> **Compartir este resultado con la cátedra**

es una acción específica distinta de compartir el proyecto.

---

# 20. Arquitectura docente

## 20.1. Jerarquía

> Mis materias → Materia → Cátedra → Panel de esa cátedra

---

## 20.2. Aislamiento

Cada cátedra contiene de forma independiente:

- estudiantes;
- currícula;
- materiales;
- cronograma;
- evidencia;
- mapa de aprendizaje;
- feedback;
- perfil agregado;
- experiencias;
- asistente.

No compartir automáticamente datos o artefactos pedagógicos entre cátedras.

---

# 21. Configuración inicial docente

## 21.1. Programa y materiales

El docente carga:

- programa;
- PDFs;
- bibliografía;
- materiales.

Educai propone:

> Materia → Módulo → Unidad/Lectura → Tema → Subtema → Capacidades

---

## 21.2. Validación curricular

Antes de interpretar evidencia:

> **Así entendimos tu materia**

Acciones:

- Está correcto
- Editar

La estructura validada se transforma en el marco de referencia de la cátedra.

---

## 21.3. Contexto físico

Configurar una vez:

- cantidad aproximada de estudiantes;
- duración habitual;
- aula;
- proyector;
- pizarrón;
- celulares;
- notebooks;
- mesas móviles/fijas;
- posibilidad de trabajo grupal.

Se utiliza para generar experiencias viables.

---

## 21.4. Cronograma

Registrar:

- clases;
- fechas;
- parciales/hitos;
- contenidos previstos.

Distinguir siempre:

> **planificado ≠ realizado**

---

# 22. Panel docente

## 22.1. Navegación

**Inicio · Mapa de aprendizaje · Cronograma · Tu aula · Asistente**

Feedback y trazabilidad son capas de profundización.

---

## 22.2. Home

Debe responder:

- ¿Dónde estoy?
- ¿Qué necesita mi aula?
- ¿Qué hago ahora?
- ¿Qué puedo mejorar?

---

## 22.3. Avance

Ejemplo:

> Clase 4 de 11  
> Próximo hito: 1° Parcial  
> Tema actual: Scrum

Es avance temporal, no comprensión.

---

## 22.4. Qué necesita tu aula hoy

Máximo tres prioridades.

Ejemplo:

> **44% necesita revisar Roles de Scrum**
>
> Principal dificultad: Product Owner vs. Scrum Master.
>
> Basado en 27 estudiantes con evidencia suficiente.

---

## 22.5. Porcentaje docente

El denominador debe ser:

> **estudiantes con evidencia suficiente sobre esa capacidad**

No todos los inscriptos.

La UI debe permitir ver el `n/N`.

---

# 23. Mapa de aprendizaje docente

Representa estado agregado por:

> módulo → unidad → tema → capacidad

Ejemplo:

| Capacidad | Aula |
|---|---:|
| Diferenciar PO y SM | 44% necesita revisión |
| Diferenciar Product/Sprint Backlog | 32% |
| Aplicar Sprint Planning | 21% |

No usar scores artificiales de “comprensión 83%”.

---

# 24. Trazabilidad docente

Desde cualquier hallazgo:

> **¿Por qué Educai detectó esto?**

Mostrar:

- denominador;
- numerador;
- tipos de evidencia;
- patrones;
- contradicciones;
- ejemplos anonimizados;
- origen;
- fecha.

Validación opcional:

- Sí
- Parcialmente
- No
- Todavía no sé

La validación docente alimenta métricas de calidad del motor.

---

# 25. Anonimato docente

El docente puede ver:

- cantidades;
- porcentajes;
- patrones;
- evidencia anonimizada;
- feedback anónimo;
- perfil agregado.

No puede ver:

- nombres asociados a errores;
- quién pertenece a un perfil;
- conversaciones identificadas;
- ranking;
- quién “no entiende”.

---

# 26. Experiencia recomendada

El concepto reemplaza “actividad recomendada”.

Educai puede recomendar:

### Presencial

- pizarra;
- papel;
- debate;
- conversación;
- role playing;
- caso;
- votación;
- trabajo grupal;
- puesta en común;
- movimiento.

### Digital

- simulación;
- escenario de decisiones;
- diagrama interactivo;
- laboratorio;
- mapa;
- línea de tiempo;
- modelo 3D;
- sistema de causa-efecto;
- juego estratégico.

Educai recomienda una opción principal.

> **Ver otra alternativa**

es secundario.

---

# 27. Motor de diseño pedagógico

Antes de crear una experiencia:

1. **Objetivo**  
   ¿Qué debe aprender?

2. **Comportamiento**  
   ¿Qué debe hacer para demostrarlo?

3. **Motivación**  
   ¿Qué razón tiene para involucrarse?

4. **Desafío**  
   ¿Qué problema pone el conocimiento en juego?

5. **Mecánica**  
   ¿Qué formato conviene?

6. **Feedback**  
   ¿Cómo descubre si funciona?

7. **Evidencia**  
   ¿Qué podrá observar Educai?

Fórmula:

> **contenido + comportamiento + motivación + mecánica + feedback + evidencia**

---

# 28. Motivaciones y principios pedagógicos

El motor puede utilizar:

- curiosidad;
- autonomía;
- dominio;
- propósito;
- cooperación;
- pertenencia;
- incertidumbre;
- reconocimiento;
- competencia liviana.

No busca entretenimiento constante.

Busca:

> **razones para prestar atención, pensar, actuar y recordar.**

---

# 29. Arquitectura de una clase

Patrón sugerido:

1. Hook
2. Misión
3. Primera hipótesis
4. Contenido
5. Aplicación
6. Interacción
7. Feedback / consecuencia
8. Segundo intento
9. Recuperación
10. Cierre

No todas las clases requieren todos los pasos.

La pregunta rectora es:

> **¿Qué proceso mental queremos provocar?**

---

# 30. Preparar próxima clase

Acción central docente.

Inputs:

- programa;
- materiales;
- cronograma;
- próximo contenido;
- mapa de aprendizaje;
- feedback;
- perfil agregado;
- contexto del aula;
- duración.

Outputs:

- objetivo;
- misión;
- secuencia;
- explicación;
- actividad;
- experiencia digital;
- materiales;
- recuperación;
- cierre.

Acciones:

- Crear presentación
- Crear actividad
- Crear simulación
- Crear material
- Crear ejercicio de cierre

---

# 31. Asistente Educai docente

Chat especializado en la cátedra actual.

Puede:

- preparar clase;
- crear slides;
- crear casos;
- diseñar debates;
- crear actividades;
- generar worksheets;
- diseñar simulaciones;
- preparar una visita;
- mejorar una dinámica;
- adaptar a tiempo/grupo;
- preparar repaso;
- revisar materiales.

No es un chatbot genérico.

---

# 32. Runtime de experiencias

## 32.1. Calidad

Las experiencias digitales pueden ser generadas mediante agentes de programación como Claude Code/Codex.

El requisito de producto no es la herramienta de generación, sino que las experiencias sean:

- funcionales;
- pedagógicamente adecuadas;
- de alta calidad;
- responsivas;
- instrumentadas.

---

## 32.2. Contrato de instrumentación

Toda experiencia debe emitir eventos estándar.

Mínimos:

- `experience_started`
- `scenario_viewed`
- `decision_made`
- `answer_submitted`
- `hint_requested`
- `variable_changed`
- `retry_started`
- `reflection_submitted`
- `experience_completed`

Cada evento debe poder relacionarse con:

- estudiante;
- cátedra;
- capacidad;
- escenario;
- intento;
- asistencia;
- resultado;
- timestamp.

---

## 32.3. Regla

> **Una experiencia interactiva no es solamente contenido. Es un instrumento de observación.**

---

# 33. Lanzar experiencia

Docente:

> **Lanzar experiencia**

Educai genera:

- QR;
- código;
- enlace.

Docente ve en vivo solamente agregados:

- participantes;
- completitud;
- distribución de decisiones;
- progreso general.

Nunca nombres asociados a respuestas.

---

# 34. Actividades presenciales y evidencia

Una actividad con:

- pizarra;
- papel;
- debate;
- conversación;

no produce automáticamente evidencia individual verificable.

Para que actualice estados individuales debe existir un mecanismo de captura, por ejemplo:

- exit ticket;
- respuesta digital;
- reflexión individual;
- artefacto subido;
- mini desafío posterior.

La observación docente general puede guardarse como evidencia contextual del aula, pero no debe modificar directamente el estado académico individual.

---

# 35. Cerrar clase

Después de una clase:

> **Cerrar clase**

Preguntas mínimas:

- ¿Qué temas llegaste a trabajar?
- ¿Qué actividad realizaste?
- ¿Qué quedó pendiente?
- Comentario opcional.

Después:

> actualizar cronograma → solicitar feedback → procesar evidencia → actualizar mapa → generar nueva recomendación

---

# 36. Feedback de la clase

Estudiante:

- qué quedó menos claro;
- qué ayudó más;
- qué mejoraría.

Duración objetivo:

> 30–60 segundos.

Docente recibe:

- qué funcionó;
- principal oportunidad;
- otros patrones;
- recomendación.

No una lista cruda de comentarios como experiencia principal.

---

# 37. Perfil agregado del aula

Puede incluir:

- orientaciones profesionales agregadas;
- intereses;
- porcentaje que trabaja;
- tipos de proyectos;
- sectores.

Nunca identidad individual.

Los perfiles se utilizan para contextualizar ejemplos y actividades, no para etiquetar alumnos.

---

# 38. Privacidad y gobernanza

## 38.1. Dominios

### Perfil personal global

Acceso:

- estudiante;
- Educai.

Docente:

- agregados solamente.

### Evidencia académica

Estudiante:

- propia.

Docente:

- agregada y anonimizada.

### Feedback de clase

Docente:

- agregado y anónimo.

### Institución

- agregados;
- no contenido individual.

---

## 38.2. Conversaciones

Las conversaciones con IA:

- no son visibles individualmente al docente;
- no son visibles a la institución;
- pueden producir evidencia académica;
- deben poder eliminarse.

---

## 38.3. Eliminación de fuentes

Si el estudiante elimina una conversación o evidencia fuente:

1. dejar de usarla;
2. invalidar evidencia derivada exclusivamente de esa fuente;
3. recalcular estados;
4. recalcular recomendaciones relevantes.

Principio:

> **fuente eliminada → modelo recalculado sin esa fuente**

---

## 38.4. Controles del estudiante

**Tus datos**

- Qué sabe Educai sobre mí
- Qué puede ver mi docente
- Conversaciones compartidas
- Proyectos
- Eliminar evidencia
- Actualizar información
- Eliminar cuenta/datos

---

## 38.5. Prevención de reidentificación

**Hipótesis inicial de privacidad a validar.**

- no mostrar agregados con menos de 5 estudiantes;
- para segmentaciones institucionales, utilizar umbral superior cuando corresponda;
- redactar automáticamente nombres, emails, teléfonos y datos identificatorios;
- evitar fragmentos que revelen personas por contexto único;
- preferir paráfrasis anónimas cuando un extracto textual pueda reidentificar.

---

## 38.6. Seguridad técnica mínima

- cifrado en tránsito;
- cifrado en reposo;
- separación de PII y evidencia cuando sea posible;
- control de acceso por rol;
- aislamiento por cátedra;
- audit logs;
- backups;
- borrado verificable;
- políticas explícitas para proveedores de modelos.

Las obligaciones legales concretas deben revisarse con asesoramiento jurídico en las jurisdicciones de lanzamiento.

---

# 39. Capa institucional

## 39.1. MVP recomendado

No construir un tercer producto complejo.

Crear:

> **Informe / vista de Impacto Educai**

read-only.

---

## 39.2. Pregunta principal

> **¿Estamos observando una mejora del aprendizaje mientras se utiliza Educai?**

No afirmar causalidad sin diseño experimental.

Preferir:

> **“Se observó una mejora durante el período.”**

No:

> **“Educai causó una mejora del 18%.”**

---

## 39.3. Métricas institucionales

### Aprendizaje

- progresión agregada de capacidades;
- capacidades con mayor mejora;
- dificultades persistentes;
- evolución después de intervenciones.

### Cobertura

- % estudiantes con evidencia suficiente;
- % capacidades con evidencia suficiente.

### Adopción

- estudiantes activos;
- docentes activos;
- cátedras activas;
- experiencias realizadas;
- conversaciones procesadas.

### Intervención

- hallazgos generados;
- recomendaciones utilizadas;
- experiencias lanzadas;
- evolución posterior.

### Percepción

- utilidad docente;
- utilidad estudiante.

---

## 39.4. Checkpoints comparables

Para medir progresión de manera más defendible:

> capacidad X → problema A → intervención → problema B equivalente

Medir cuántos estudiantes pasan de:

- Conviene revisar / En desarrollo

a:

- Evidencia sólida

utilizando evidencia nueva e independiente.

---

# 40. Métricas de producto

## 40.1. North Star

### Evidence-backed Capability Progressions

Cantidad de progresiones de capacidad respaldadas por nueva evidencia independiente, normalizadas por estudiante activo y período.

Ejemplos de progresión:

- Todavía no sabemos → En desarrollo
- Conviene revisar → En desarrollo
- En desarrollo → Evidencia sólida
- Conviene revisar → Evidencia sólida

No contar cambios producidos únicamente por una reinterpretación del modelo sin nueva evidencia.

---

## 40.2. Leading metric

### Closed Learning Loops

Un loop se considera cerrado cuando:

> recomendación → acción → evidencia → feedback → actualización → nueva decisión

Medir:

> loops cerrados por estudiante activo.

---

## 40.3. Métricas del estudiante

- Recommendation Start Rate
- Recommendation Completion Rate
- tiempo hasta comenzar;
- Continue Where You Left Off usage;
- % capacidades con evidencia;
- progresión de estados;
- % recomendaciones rechazadas;
- motivos de desacuerdo;
- retorno después de feedback;
- recurrencia semanal;
- satisfacción con utilidad de la próxima acción.

---

## 40.4. Métricas del docente

- Recommendation → Intervention Rate
- tiempo desde hallazgo hasta intervención;
- % docentes que usan “Qué necesita tu aula”;
- experiencias creadas;
- experiencias lanzadas;
- clases preparadas;
- clases cerradas;
- frecuencia semanal;
- validación de hallazgos;
- utilidad percibida.

---

## 40.5. Métricas del motor

- Evidence Coverage
- Curriculum Mapping Accuracy
- Capability Mapping Accuracy
- Teacher Agreement Rate
- Student Recommendation Agreement
- Contradiction Detection Rate
- Contradiction Resolution Rate
- State Stability
- Provenance mix
- % evidencia altamente asistida
- Recommendation Acceptance Rate

---

## 40.6. Métrica de efectividad de intervención

Para cada dificultad:

> hallazgo → experiencia aplicada → evidencia posterior

Medir:

- cambio de estado;
- tiempo hasta cambio;
- mantenimiento posterior;
- tipo de experiencia utilizada.

A largo plazo esto permite aprender:

> **qué tipo de experiencia funciona mejor para qué tipo de dificultad.**

---

## 40.7. Métricas que no son North Star

No optimizar principalmente por:

- minutos;
- mensajes;
- páginas vistas;
- cantidad de chats;
- streaks;
- clicks;
- actividades por sí solas.

---

# 41. Modelo de datos conceptual

## Student

- id
- account
- onboarding_status
- profile_version
- privacy_preferences

## StudentProfile

- context
- archetypes
- dimensions
- interests
- anti_preferences
- strengths
- development_interests
- professional_hypothesis
- contradictions
- uncertainties
- confidence
- history

## Subject

- id
- name
- institution

## CourseSection

- id
- subject_id
- teacher_id
- schedule
- classroom_context
- status

## CurriculumNode

- id
- parent_id
- type
- title
- order
- source

## Capability

- id
- curriculum_node_id
- statement
- expected_cognitive_level
- prerequisites

## EvidenceEvent

- ver sección 11

## CapabilityState

- student_id
- course_section_id
- capability_id
- visible_state
- internal_confidence
- supporting_evidence_ids
- contradicting_evidence_ids
- updated_at
- interpretation_version

## Recommendation

- id
- target_user
- course_section_id
- capability_ids
- reason
- priority
- action_type
- source_state
- status
- explanation

## Project

- ver sección 19

## ClassSession

- id
- course_section_id
- planned_date
- planned_topics
- actual_topics
- activities
- pending_items
- closed_at

## ExperienceDefinition

- id
- course_section_id
- capabilities
- objective
- format
- instructions
- instrumentation_contract
- version

## ExperienceRun

- id
- experience_id
- student_id
- events
- started_at
- completed_at

## ClassFeedback

- course_section_id
- class_session_id
- anonymous_response
- processed_patterns

---

# 42. Eventos analíticos mínimos

## Estudiante

- onboarding_started
- onboarding_stage_completed
- onboarding_completed
- recommendation_viewed
- recommendation_started
- recommendation_completed
- recommendation_disagreed
- session_resumed
- ai_chat_started
- external_chat_uploaded
- external_chat_confirmed
- capability_detail_viewed
- evidence_detail_viewed
- project_created
- profile_viewed
- profile_info_updated
- class_feedback_submitted

## Docente

- course_section_opened
- curriculum_map_confirmed
- curriculum_map_edited
- learning_insight_viewed
- traceability_opened
- insight_validated
- recommended_experience_opened
- experience_generated
- experience_launched
- next_class_prepared
- class_closed
- feedback_summary_viewed

---

# 43. Flujos críticos

## 43.1. Primer ingreso estudiante

Crear cuenta  
→ onboarding único  
→ mapa inicial  
→ ingresar/unirse a cátedra  
→ Home  
→ próxima acción.

---

## 43.2. Estudiar con IA

Materia  
→ acción recomendada  
→ IA contextualizada  
→ estudiante explica/resuelve  
→ evidence events  
→ feedback  
→ estado actualizado  
→ próxima acción.

---

## 43.3. Importar conversación

Materia  
→ subir TXT/MD  
→ parsear  
→ confirmar  
→ extraer evidence events  
→ actualizar estados  
→ mostrar resultado.

---

## 43.4. Experiencia docente

Hallazgo  
→ experiencia recomendada  
→ docente adapta  
→ lanzar  
→ estudiantes participan  
→ events  
→ evidence events  
→ mapa actualizado.

---

## 43.5. Clase presencial

Preparar clase  
→ enseñar  
→ actividad presencial  
→ captura opcional de evidencia  
→ cerrar clase  
→ feedback  
→ recomendaciones nuevas.

---

# 44. Requisitos funcionales — Estudiante

### STU-001
El onboarding se completa una sola vez y genera un perfil global reutilizado en todas las materias.

### STU-002
El estudiante puede unirse a una cátedra por código, enlace o QR.

### STU-003
La Home muestra una única próxima acción prioritaria.

### STU-004
Educai permite continuar automáticamente una sesión interrumpida.

### STU-005
Cada materia muestra capacidades, estado y próxima acción.

### STU-006
El alumno puede estudiar con IA integrada.

### STU-007
El alumno puede importar conversaciones `.txt` y `.md`.

### STU-008
El alumno puede recibir feedback inmediato después de experiencias instrumentadas.

### STU-009
El alumno puede abrir “¿Por qué?” para comprender una recomendación.

### STU-010
El alumno puede manifestar desacuerdo con una recomendación.

### STU-011
El alumno puede crear proyectos globales.

### STU-012
El alumno puede utilizar un proyecto como contexto de aprendizaje.

### STU-013
El alumno puede ver su perfil longitudinal.

### STU-014
El alumno puede eliminar fuentes de evidencia y provocar recálculo.

### STU-015
El alumno puede ver qué información puede acceder cada rol.

---

# 45. Requisitos funcionales — Docente

### TCH-001
El docente puede gestionar múltiples materias y cátedras aisladas.

### TCH-002
Puede cargar programa y materiales.

### TCH-003
Educai genera un mapa curricular y el docente lo valida.

### TCH-004
Puede configurar cronograma y contexto físico.

### TCH-005
La Home muestra hasta tres prioridades de aprendizaje.

### TCH-006
Cada prioridad puede abrir trazabilidad.

### TCH-007
Puede validar o cuestionar hallazgos.

### TCH-008
Educai recomienda una experiencia principal.

### TCH-009
El docente puede pedir otra alternativa.

### TCH-010
Puede preparar la próxima clase con el asistente.

### TCH-011
Puede generar presentaciones, actividades, simulaciones y materiales.

### TCH-012
Puede lanzar experiencias mediante QR/código/enlace.

### TCH-013
Puede ver participación agregada en vivo.

### TCH-014
Puede cerrar una clase y registrar lo ocurrido.

### TCH-015
Puede ver feedback anónimo procesado.

### TCH-016
Puede ver perfil agregado del aula.

### TCH-017
Nunca puede identificar qué estudiante produjo una dificultad o comentario.

---

# 46. Requisitos funcionales — Institución

### INS-001
Puede recibir un informe/vista agregada de impacto.

### INS-002
Puede ver adopción, cobertura y progresión de capacidades.

### INS-003
Puede ver dificultades persistentes agregadas.

### INS-004
No puede acceder a conversaciones, proyectos privados, perfil profesional individual ni evidencia individual.

### INS-005
Las métricas de mejora deben evitar lenguaje causal salvo que exista un diseño experimental que lo permita.

---

# 47. Requisitos no funcionales

## Rendimiento

- Home estudiante y docente: respuesta percibida rápida;
- feedback inmediato después de una acción;
- procesamiento pesado puede utilizar estados visibles con progreso real.

## Mobile

El producto estudiante debe ser mobile-first.

## Accesibilidad

- navegación por teclado;
- contraste suficiente;
- labels accesibles;
- no depender únicamente de color;
- experiencias interactivas deben contemplar alternativas cuando sea posible.

## Auditabilidad

Toda interpretación debe guardar:

- versión del motor;
- evidencia utilizada;
- timestamp;
- rationale;
- cambios posteriores.

## Versionado

Versionar:

- perfil;
- currícula;
- capacidades;
- interpretaciones;
- experiencias;
- prompts;
- reglas del motor.

---

# 48. Guardrails de IA

La IA no debe:

- inventar contenidos curriculares;
- atribuir capacidades sin evidencia;
- confundir una preferencia con una competencia;
- mostrar identidades profesionales como definitivas;
- revelar información individual al docente;
- bajar dificultad académica porque al estudiante “no le gusta” un tema;
- generar una experiencia sin instrumentación cuando pretende usarse como evidencia;
- tratar una respuesta copiada después de revelar la solución como evidencia independiente;
- presentar causalidad institucional no demostrada.

---

# 49. Alcance del MVP técnico

El MVP de Educai incluye **panel docente y panel estudiante completos**, no una demo reducida de navegación.

## Estudiante

- onboarding completo;
- perfil global;
- Inicio;
- Mis materias;
- Mi perfil;
- unirse a cátedra;
- IA integrada;
- importación TXT/MD;
- próximas acciones;
- progreso por capacidades;
- detalle de evidencia;
- feedback;
- proyectos;
- experiencias digitales;
- privacidad.

## Docente

- materias/cátedras;
- setup curricular;
- cronograma;
- Home;
- mapa de aprendizaje;
- trazabilidad;
- Tu aula;
- feedback;
- asistente;
- preparar clase;
- generación de experiencias;
- lanzamiento;
- vista agregada en vivo;
- cierre de clase.

## Core

- modelo de datos;
- evidence pipeline;
- interpretation engine;
- recommendation engine;
- experience instrumentation;
- anonymity/privacy enforcement;
- analytics.

## Institución

- informe/vista mínima agregada;
- no es blocker para el primer uso pedagógico.

---

# 50. Fuera del MVP

- LMS completo;
- gradebook;
- asistencia;
- mensajería;
- foros;
- institución con BI complejo;
- integraciones profundas con todos los LMS;
- credenciales públicas verificables;
- marketplace de experiencias;
- ranking;
- gamificación basada en streaks;
- causal inference institucional avanzada.

---

# 51. Criterios de aceptación globales

El MVP se considera funcionalmente correcto cuando:

1. un estudiante puede completar onboarding una sola vez y utilizar ese perfil en múltiples materias;
2. una nueva cátedra no dispara onboarding nuevamente;
3. cada cátedra mantiene aislamiento pedagógico;
4. el estudiante puede estudiar dentro de Educai o importar una conversación externa;
5. ambas vías generan evidence events trazables;
6. el motor puede mapear evidencia a capacidades;
7. cada capacidad puede asumir uno de los cuatro estados visibles;
8. toda recomendación importante tiene explicación;
9. el estudiante recibe una próxima acción dominante;
10. el docente recibe prioridades agregadas;
11. el docente puede profundizar hasta evidencia anonimizada;
12. ninguna vista docente expone identidad asociada a aprendizaje;
13. el docente puede generar y lanzar una experiencia;
14. la experiencia emite eventos estandarizados;
15. esos eventos actualizan evidencia;
16. el docente puede cerrar clase;
17. el estudiante puede eliminar una fuente y el modelo se recalcula;
18. el perfil profesional global puede evolucionar sin sobrescribir historial;
19. la institución puede recibir métricas agregadas sin drilldown individual;
20. las métricas de producto permiten medir loops y progresión de capacidades.

---

# 52. Hipótesis a validar

Aunque el producto esté especificado, estas decisiones deben tratarse como hipótesis:

### H1 — Próxima mejor acción
Una recomendación prioritaria reduce fricción y aumenta acciones educativas útiles frente a una navegación basada principalmente en menús.

### H2 — Progreso por capacidades
Mostrar “lo que ya podés hacer” es más motivador y útil que mostrar contenido completado.

### H3 — Evidencia conversacional
Las conversaciones con IA contienen suficiente evidencia válida como para complementar ejercicios estructurados.

### H4 — Trazabilidad
La explicación de recomendaciones aumenta confianza de estudiante y docente.

### H5 — Recomendaciones docentes
El docente utiliza más una recomendación concreta que un dashboard analítico sin acción.

### H6 — Experiencias generadas
Los docentes utilizan experiencias generadas si están adaptadas a su cátedra y requieren poca preparación adicional.

### H7 — Perfil longitudinal
El perfil de autoconocimiento gana utilidad cuando se actualiza con experiencias reales y no queda congelado en el onboarding.

### H8 — Proyectos
Usar proyectos reales como contexto mejora relevancia sin reducir aprendizaje obligatorio.

### H9 — Institución
La institución valora una medición agregada de progresión de capacidades y cobertura de evidencia como señal de valor.

---

# 53. Plan de validación

## Estudiante

Observar:

- tiempo hasta primera acción;
- inicio/completitud;
- comprensión de estados;
- confianza en “¿por qué?”;
- utilidad percibida;
- regreso voluntario;
- diferencias entre recomendación y elección manual.

## Docente

Observar:

- si entiende el hallazgo;
- si confía en el denominador;
- si utiliza experiencia recomendada;
- cuánto edita;
- si cierra clase;
- si la recomendación cambia decisiones reales.

## Motor

Auditar muestras manualmente:

- mapping curricular;
- extracción de evidencia;
- fuerza;
- estado;
- contradicción;
- recomendación.

---

# 54. Preguntas abiertas de implementación

Estas preguntas no bloquean la tesis del producto, pero deben cerrarse en especificación técnica:

- proveedor/modelo principal por tarea;
- arquitectura de ejecución segura de experiencias generadas;
- sandboxing del código generado;
- tiempo máximo de generación;
- sistema de versionado de prompts;
- formato interno de currícula;
- estrategia de recuperación semántica sobre materiales;
- estrategia de redacción/anominización;
- política de retención exacta;
- jurisdicción y requisitos legales;
- integración futura con LMS;
- mecanismo exacto de invitación a cátedras.

---

# 55. Definición final del producto

## Para el estudiante

> **Educai no te pide que administres tu aprendizaje. Utiliza la evidencia disponible para mostrarte qué estás aprendiendo, qué ya podés hacer y cuál es la siguiente acción que más probablemente te haga avanzar.**

## Para el docente

> **Educai convierte evidencia anónima del aula en una mejor próxima clase.**

## Para la institución

> **Educai permite observar, con evidencia agregada, si las capacidades que la currícula busca desarrollar están progresando y dónde persisten dificultades.**

## Tesis unificada

> **Educai convierte el aprendizaje en un sistema observable y accionable: entiende experiencias, produce evidencia, interpreta capacidades y utiliza esa información para diseñar la siguiente mejor decisión educativa.**