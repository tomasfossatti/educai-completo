# Educai · Guion de demo (10 a 15 minutos)

**Para quién:** una docente universitaria que todavía no conoce Educai.

**Qué tiene que llevarse:**
- Educai detecta una dificultad concreta del aula a partir de lo que hacen sus estudiantes.
- Explica cómo la detectó sin exponer a nadie.
- Propone una intervención.
- Muestra qué cambió después de aplicarla.

**Escenario:** cátedra *Innovación de Procesos y Diseño de Proyectos*, Comisión A, 36 estudiantes, clase 4 de 11, tema actual Scrum, primer parcial en unos diez días.

---

## Antes de empezar (5 minutos antes)

1. Levantá la app con `pnpm dev` y abrí `http://localhost:3000/entrar`.
2. Tocá **Reiniciar demo**. El escenario se recrea en unos 15 segundos y los números de este guion vuelven a ser exactos.
3. Prepará dos ventanas:
   - una de escritorio para la docente;
   - una angosta (o el celular) para la estudiante.
4. Si vas a usar un celular real, levantá la app con `pnpm dev -H 0.0.0.0` y definí `APP_BASE_URL=http://<IP-de-tu-compu>:3000` para que el QR apunte a tu máquina. Ambos equipos tienen que estar en la misma red.

Sin `ANTHROPIC_API_KEY` todo el guion funciona igual: el tutor, la evaluación y la generación de experiencias usan sus versiones deterministas.

---

## 1. La pregunta de la docente (1 minuto)

**Pantalla:** `/entrar` → **Ana Torres** → *Innovación de Procesos y Diseño de Proyectos*.

Abrí con la pregunta que Educai intenta responder: *¿qué necesita mi aula hoy y qué debería hacer en la próxima clase?*

Mostrá la barra superior: clase 4 de 11, el parcial en diez días, el tema actual (Scrum) y los 36 inscriptos.

## 2. Una dificultad concreta (2 minutos)

**Pantalla:** Inicio de la cátedra, bloque *Qué necesita tu aula hoy*.

La primera tarjeta dice **44 % necesita revisar Product Owner vs. Scrum Master**, con 12 de 27 estudiantes con evidencia suficiente y la principal dificultad: le asignan al Scrum Master decisiones sobre el backlog.

Puntos para remarcar:

- **El denominador.** Son 27 estudiantes con evidencia suficiente y no 36 inscriptos. Educai no saca porcentajes sobre estudiantes que todavía no observó.
- **Las etiquetas.** *Explican bien, aplican con dificultad* y *Antes del parcial* resumen por qué este hallazgo va primero.
- **Lo que Educai no afirma.** Retrospectiva aparece como *Necesitamos observar mejor antes de concluir*. Con poca cobertura, el sistema pide más evidencia en lugar de inventar un número.

## 3. Por qué Educai detectó esto (2 a 3 minutos)

**Pantalla:** **¿Por qué Educai detectó esto?** en la primera tarjeta.

Recorré la página de arriba hacia abajo:

1. **Decidir.** Arriba está el hallazgo y, a la derecha, la intervención recomendada con su motivo: la mayoría ya explica cada rol, la dificultad aparece al decidir, conviene menos teoría y más decisiones.
2. **Entender.**
   - Cómo se calculó: al menos dos oportunidades independientes, una sin ayuda, al nivel "aplicar".
   - Cuántos de los 12 explican bien pero fallan al aplicar.
   - Por qué importa ahora: es base de otros temas y el parcial está cerca.
3. **Auditar.**
   - De dónde sale la evidencia: actividades en clase y explicaciones en el tutor.
   - Cuándo se observó.
   - Ejemplos anónimos con la situación, la opción elegida y cuántos estudiantes la eligieron.
4. **Privacidad.** El pie lo dice explícitamente: Educai nunca muestra quién respondió qué, y las cifras con menos de 5 estudiantes no se muestran. La regla se aplica en el servidor, así que ningún dato individual llega a la pantalla de la docente.
5. **Validación.** *¿Coincide con lo que ves en clase?* registra el criterio docente sin cambiar la evidencia.

## 4. Generar y lanzar la experiencia (1 a 2 minutos)

**Pantalla:** **Generar experiencia** → vista previa → **Usar experiencia y lanzar**.

- **La vista previa.** Son cinco situaciones ambiguas en "Rutas Verdes", una startup de entregas. En *Configuración* se ve que cada opción incorrecta está asociada a una confusión conocida, por eso las respuestas se pueden interpretar sin adivinar.
- **Al lanzar.** Aparecen el QR, el código y el tablero en vivo.

## 5. La estudiante (3 minutos)

**Pantalla (ventana angosta):** escaneá el QR o abrí `/x/<código>` → **Lucía Fernández**.

Antes de empezar, si querés, mostrá el inicio de Lucía: *Tu próximo paso* ya es la **Actividad de tu docente**, y *¿Por qué me recomendás esto?* explica el motivo.

En la experiencia:

- Respondé las cinco situaciones. Cada decisión recibe feedback inmediato y hay pistas disponibles; usar una pista queda registrado como ayuda.
- Para que el cambio de estado se vea claro, elegí la opción correcta en todas.
- Si preferís mostrar el caso contrario, equivocate dos veces con la misma confusión (darle la prioridad al Scrum Master): el estado sigue en *Conviene revisar*, porque un acierto aislado no alcanza.

Al terminar, **Ver qué aprendimos** muestra:

- **El cambio de estado.** Product Owner vs. Scrum Master pasa de *Conviene revisar* a *Evidencia sólida*.
- **Las secciones de cierre.** *Fortaleciste* y *Conviene revisar*.
- **Un siguiente paso distinto:** *Probalo en situaciones: Quién hace qué durante el Sprint*.

Volvé al inicio de Lucía para mostrar que la recomendación cambió. Este es el núcleo del producto: una acción nueva generó evidencia, modificó la interpretación y produjo otra recomendación.

## 6. Vuelta a la docente: el efecto en el aula (2 a 3 minutos)

**Pantalla (docente):** tablero en vivo.

1. **El ingreso de Lucía.** El tablero ya cuenta su participación. La distribución por situación no se muestra todavía porque hay menos de 5 respuestas.
2. **Simular participación del aula (modo demo).** Hace que 26 compañeros sintéticos respondan. Cada respuesta pasa por el mismo runtime, la misma evidencia y la misma interpretación que la de Lucía.
3. **La distribución.** Ahora aparece por situación, con la opción correcta marcada y las confusiones más elegidas.
4. **Cerrar y ver qué observamos.**
   - El porcentaje de *necesita revisar* pasa de **44 % (12 de 27)** a **24 % (8 de 34)**, y la cobertura crece porque más estudiantes tienen evidencia suficiente.
   - Educai señala la situación con más dispersión para la puesta en común.
   - Propone la próxima intervención: **32 % necesita revisar Product Backlog vs. Sprint Backlog**.
   - La aclaración *hablamos de lo observado durante el período, no de causalidad* es parte del mensaje.
5. **Inicio de la cátedra.** El bloque **Qué cambió con la última experiencia** resume el antes y el después, y la prioridad principal del aula ya es otra.

## 7. Cierre (1 minuto)

Volvé a la pregunta del principio. La docente vio:

- una dificultad concreta con su base de evidencia;
- una intervención de 15 minutos;
- el efecto agregado de esa intervención;
- la siguiente prioridad.

En ningún momento vio datos individuales.

---

## Si sobra tiempo o hay preguntas

| Pregunta | Qué mostrar |
|---|---|
| "¿Y si un estudiante usa ChatGPT?" | Como Lucía: materia → **¿Estudiaste esto con otra IA?** → subí `public/demo/conversacion-retrospectiva.md`. Educai detecta roles y temas, pide confirmación y usa solo las explicaciones de la estudiante. Las preguntas y las respuestas de la IA no cuentan, y Retrospectiva pasa a *En desarrollo*. |
| "¿Qué controla el estudiante?" | **Mi perfil**: *Qué puede ver tu docente* y la lista de fuentes. Eliminar la conversación importada recalcula el estado, que vuelve a *Todavía no sabemos*. |
| "¿Hay un tutor?" | Desde una capacidad, **Entender mejor con el tutor** → **Ahora lo pruebo yo**. Solo la respuesta propia del estudiante se evalúa como evidencia. |
| "¿Cómo armo mi cátedra?" | **Mis cátedras** → **Crear cátedra** → **Usar programa de ejemplo**. Educai propone unidades, temas y capacidades en *Así entendimos tu materia*. La docente edita y activa, y la cátedra arranca sin hallazgos inventados, con un QR para invitar estudiantes. |
| "¿Todos los estudiantes ven lo mismo?" | Entrá como **Nicolás Herrera**: con la misma cátedra, su próximo paso es transferir lo aprendido a un caso nuevo. |
| "¿Puede ver otra docente mis datos?" | Las rutas docentes verifican la asignación a la cátedra en el servidor; para otra cátedra la respuesta es "no encontrado". |

## Problemas frecuentes

- **Los números no coinciden con el guion.** Alguien usó la demo antes. Tocá **Reiniciar demo** en `/entrar`.
- **El QR no abre en el celular.** Falta `APP_BASE_URL` con la IP de la compu, o el servidor no escucha en `0.0.0.0`.
- **Generar experiencia muestra un aviso sobre IA en una cátedra nueva.** Sin `ANTHROPIC_API_KEY`, solo las capacidades de la cátedra demo tienen banco de situaciones curado.
