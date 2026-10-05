import type { CognitiveLevel } from "@/modules/shared/enums";

/**
 * Banco curado de situaciones de decisión (fallback del generador, EDU-1010).
 * Cada opción incorrecta declara el error frecuente que revela (C:762-773), lo que permite
 * puntuar de forma determinista sin interpretación posterior de un LLM.
 * Contexto narrativo: "Rutas Verdes", startup cordobesa de entregas en bicicleta y vehículos eléctricos.
 */

export type BankOption = { id: string; text: string; correct: boolean; errorKey?: string | null; feedback: string };
export type BankScenario = {
  id: string;
  capabilityKey: string;
  level: CognitiveLevel;
  family: string;
  situation: string;
  question: string;
  options: BankOption[];
  hints: string[];
  takeaway: string;
};

export const BANK_ORGANIZATION = "Rutas Verdes";
export const BANK_INTRO =
  "Rutas Verdes es una startup de Córdoba que hace entregas en bicicleta y vehículos eléctricos. Su equipo de producto trabaja con Scrum: Sofía es la Product Owner, Martín es el Scrum Master y hay cinco Developers.";

export const EXPERIENCE_TITLES: Record<string, { title: string; description: string }> = {
  "CAP-SCRUM-03": {
    title: "¿Quién debería intervenir? Situaciones ambiguas en un equipo Scrum",
    description: "Decidí, en situaciones reales de un Sprint, si le corresponde al Product Owner o al Scrum Master.",
  },
  "CAP-SCRUM-04": {
    title: "Quién hace qué durante el Sprint",
    description: "Asigná responsabilidades entre Product Owner, Scrum Master y Developers en situaciones de un Sprint.",
  },
  "CAP-ART-01": {
    title: "¿A qué backlog va?",
    description: "Decidí qué corresponde al Product Backlog y qué al Sprint Backlog.",
  },
  "CAP-EV-01": { title: "Planificar un Sprint con objetivo", description: "Tomá decisiones de Sprint Planning en Rutas Verdes." },
  "CAP-EV-02": { title: "Una retrospectiva que sirva", description: "Elegí cómo facilitar una retrospectiva que termine en mejoras." },
  "CAP-SPRINT-01": { title: "Cómo funciona un Sprint", description: "Reconocé qué pasa en cada momento de un Sprint." },
  "CAP-SCRUM-01": { title: "Qué hace el Product Owner", description: "Reconocé las responsabilidades del Product Owner." },
  "CAP-SCRUM-02": { title: "Qué hace el Scrum Master", description: "Reconocé las responsabilidades del Scrum Master." },
};

const PO_HINT = "Pensá en quién responde por el valor del producto y por el orden del Product Backlog.";
const SM_HINT = "Pensá en quién ayuda al equipo a trabajar mejor y a sacar obstáculos, sin decidir el producto.";

export const SCENARIO_BANK: BankScenario[] = [
  // ── CAP-SCRUM-03 · Product Owner vs. Scrum Master ─────────────────────────
  {
    id: "posm-01",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "prioridad",
    situation:
      "A mitad del Sprint, el gerente comercial le escribe a Martín (Scrum Master): necesita que la integración con una nueva app de pagos sea “lo más urgente” porque la pidió un cliente grande.",
    question: "¿Quién decide si esa integración sube en el Product Backlog?",
    options: [
      { id: "a", text: "Sofía, la Product Owner, que ordena el Product Backlog según el valor.", correct: true, feedback: "Exacto. El orden del Product Backlog es responsabilidad de la Product Owner. Martín puede ayudar a que el pedido llegue a ella, pero no decide la prioridad." },
      { id: "b", text: "Martín, el Scrum Master, porque protege al equipo y organiza el trabajo.", correct: false, errorKey: "sm_prioritizes_backlog", feedback: "Martín protege al equipo de interrupciones, pero no decide qué tiene más valor. La prioridad del backlog es de la Product Owner." },
      { id: "c", text: "El gerente comercial, porque es quien tiene el contacto con el cliente.", correct: false, errorKey: "stakeholder_overrides_po", feedback: "El gerente es un stakeholder: su pedido es un insumo valioso, pero quien decide el orden del backlog es la Product Owner." },
    ],
    hints: [PO_HINT, "El Product Backlog tiene una única persona responsable de su orden."],
    takeaway: "Pedidos de prioridad → Product Owner. El Scrum Master facilita que esa conversación ocurra.",
  },
  {
    id: "posm-02",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "impedimento",
    situation:
      "Hace tres días que el equipo no puede publicar una versión porque el área de infraestructura no habilita el acceso al servidor. Los Developers ya lo mencionaron dos veces en la Daily.",
    question: "¿A quién le corresponde ocuparse de destrabar este impedimento?",
    options: [
      { id: "a", text: "A Martín, el Scrum Master, que se ocupa de que se remuevan los impedimentos del equipo.", correct: true, feedback: "Correcto. Remover impedimentos que el equipo no puede resolver solo es una responsabilidad central del Scrum Master." },
      { id: "b", text: "A Sofía, la Product Owner, porque es quien habla con las otras áreas.", correct: false, errorKey: "po_removes_impediments", feedback: "La Product Owner trabaja con stakeholders sobre el producto, pero destrabar impedimentos del equipo le corresponde al Scrum Master." },
      { id: "c", text: "A Martín, que debería ordenarle a un Developer que lo resuelva aunque quede fuera del Sprint.", correct: false, errorKey: "role_as_manager", feedback: "El Scrum Master no reparte trabajo como un jefe. Puede gestionar el impedimento con infraestructura sin reasignar tareas del equipo." },
    ],
    hints: [SM_HINT, "Un impedimento es algo que frena al equipo y que no puede resolver por sí mismo."],
    takeaway: "Impedimentos que frenan al equipo → Scrum Master.",
  },
  {
    id: "posm-03",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "daily",
    situation:
      "La Daily de Rutas Verdes empezó a durar 40 minutos: Sofía, la Product Owner, la usa para revisar tarea por tarea qué hizo cada Developer.",
    question: "¿Qué debería pasar?",
    options: [
      { id: "a", text: "Martín ayuda al equipo a que la Daily vuelva a ser una reunión breve de los Developers, enfocada en el objetivo del Sprint.", correct: true, feedback: "Bien. El Scrum Master cuida que los eventos cumplan su propósito; la Daily es de los Developers, no un control de tareas." },
      { id: "b", text: "Sofía sigue controlando cada tarea, porque responde por el producto.", correct: false, errorKey: "role_as_manager", feedback: "La Product Owner responde por el valor del producto, no por controlar tareas individuales. Eso convierte el rol en un jefe tradicional." },
      { id: "c", text: "Martín pasa a dirigir la Daily y decide quién hace cada tarea.", correct: false, errorKey: "role_as_manager", feedback: "El Scrum Master facilita, pero no asigna tareas: los Developers se autoorganizan para cumplir el objetivo." },
    ],
    hints: [SM_HINT, "¿De quién es la Daily y para qué sirve?"],
    takeaway: "Cuidar que los eventos cumplan su propósito → Scrum Master. Nadie usa la Daily para controlar personas.",
  },
  {
    id: "posm-04",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "contenido_item",
    situation:
      "Un Developer está trabajando en la historia “Seguimiento del pedido en tiempo real” y no sabe si debe incluir notificaciones push o si alcanza con ver el mapa.",
    question: "¿A quién debería consultar?",
    options: [
      { id: "a", text: "A Sofía, la Product Owner, que aclara qué se espera del ítem y por qué es valioso.", correct: true, feedback: "Correcto. Aclarar el alcance y el valor de un ítem del backlog es parte de la responsabilidad de la Product Owner." },
      { id: "b", text: "A Martín, el Scrum Master, que define los requisitos para que el equipo no pierda tiempo.", correct: false, errorKey: "sm_prioritizes_backlog", feedback: "El Scrum Master no define el contenido del producto. Puede ayudar a que la consulta llegue rápido a la Product Owner." },
      { id: "c", text: "Directamente al cliente que pidió la funcionalidad, para que decida él.", correct: false, errorKey: "stakeholder_overrides_po", feedback: "Hablar con usuarios puede ser útil, pero la decisión sobre el alcance del ítem es de la Product Owner." },
    ],
    hints: [PO_HINT, "La pregunta es sobre qué tiene que hacer el producto, no sobre cómo trabaja el equipo."],
    takeaway: "Dudas sobre qué tiene que hacer el producto → Product Owner.",
  },
  {
    id: "posm-05",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "conflicto",
    situation:
      "Dos Developers discuten en cada revisión de código y el clima del equipo empeora. Ya se nota en la velocidad del Sprint.",
    question: "¿Quién debería intervenir primero?",
    options: [
      { id: "a", text: "Martín, el Scrum Master, ayudando al equipo a resolver el conflicto y acordar cómo trabajar.", correct: true, feedback: "Exacto. Ayudar al equipo a resolver conflictos y mejorar su forma de trabajo es parte del rol del Scrum Master." },
      { id: "b", text: "Sofía, la Product Owner, porque el conflicto afecta la entrega del producto.", correct: false, errorKey: "po_removes_impediments", feedback: "Aunque afecta el producto, facilitar la dinámica del equipo le corresponde al Scrum Master." },
      { id: "c", text: "Martín decide quién tiene razón y define la regla de revisión.", correct: false, errorKey: "role_as_manager", feedback: "El Scrum Master facilita que el equipo llegue a un acuerdo; no impone la decisión como un jefe." },
    ],
    hints: [SM_HINT, "¿El problema es sobre el producto o sobre cómo trabaja el equipo?"],
    takeaway: "Dinámica y conflictos del equipo → Scrum Master, facilitando (no imponiendo).",
  },
  {
    id: "posm-06",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "prioridad",
    situation:
      "El CEO le pide a Martín, el Scrum Master, que agregue al Sprint una pantalla de estadísticas para mostrarla en una reunión con inversores la semana que viene.",
    question: "¿Qué debería hacer Martín?",
    options: [
      { id: "a", text: "Llevar el pedido a Sofía, la Product Owner, que decide si entra y con qué prioridad.", correct: true, feedback: "Correcto. El Scrum Master redirige pedidos de producto a la Product Owner y protege el Sprint de cambios no acordados." },
      { id: "b", text: "Agregarlo al Sprint Backlog porque lo pide la dirección.", correct: false, errorKey: "stakeholder_overrides_po", feedback: "Que lo pida la dirección no cambia quién decide. El pedido pasa por la Product Owner." },
      { id: "c", text: "Decidir él mismo si es más valioso que lo planificado.", correct: false, errorKey: "sm_prioritizes_backlog", feedback: "Comparar valor y decidir prioridades es responsabilidad de la Product Owner, no del Scrum Master." },
    ],
    hints: [PO_HINT, "El pedido llegó al Scrum Master, pero ¿es él quien lo decide?"],
    takeaway: "Aunque el pedido llegue al Scrum Master, la decisión de producto es de la Product Owner.",
  },
  {
    id: "posm-07",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "review",
    situation:
      "En la Sprint Review, los stakeholders proponen seis cambios para la app de repartidores. Algunos se contradicen entre sí.",
    question: "¿Quién decide qué cambios se incorporan al Product Backlog y en qué orden?",
    options: [
      { id: "a", text: "Sofía, la Product Owner, considerando el feedback recibido.", correct: true, feedback: "Bien. La Review aporta información, y la Product Owner la usa para actualizar y ordenar el Product Backlog." },
      { id: "b", text: "Martín, el Scrum Master, porque facilitó la Review.", correct: false, errorKey: "sm_prioritizes_backlog", feedback: "Facilitar la Review no le da al Scrum Master la decisión sobre el backlog." },
      { id: "c", text: "Se incorporan en el orden en que los propusieron los stakeholders.", correct: false, errorKey: "stakeholder_overrides_po", feedback: "Los stakeholders aportan ideas, pero el orden del backlog lo define la Product Owner según el valor." },
    ],
    hints: [PO_HINT, "Que alguien facilite una reunión no significa que decida lo que surge de ella."],
    takeaway: "Facilitar la Review → Scrum Master. Decidir qué entra al backlog → Product Owner.",
  },
  {
    id: "posm-08",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "retro",
    situation:
      "Las últimas tres retrospectivas repitieron las mismas quejas: “las historias llegan poco claras” y “nadie cumple lo que acordamos”. No cambió nada.",
    question: "¿A quién le corresponde ayudar a que la retrospectiva produzca mejoras concretas?",
    options: [
      { id: "a", text: "A Martín, el Scrum Master, que facilita y ayuda al equipo a convertir los hallazgos en acciones.", correct: true, feedback: "Correcto. El Scrum Master ayuda a que el equipo inspeccione y adapte su forma de trabajo con acciones concretas." },
      { id: "b", text: "A Sofía, la Product Owner, porque las mejoras impactan en el valor del producto.", correct: false, errorKey: "po_removes_impediments", feedback: "La Product Owner participa, pero facilitar la mejora continua del equipo es responsabilidad del Scrum Master." },
      { id: "c", text: "A Martín, que debería imponer las mejoras y controlar que se cumplan.", correct: false, errorKey: "role_as_manager", feedback: "El Scrum Master no impone ni controla: ayuda al equipo a comprometerse con sus propias mejoras." },
    ],
    hints: [SM_HINT, "La retrospectiva es sobre cómo trabaja el equipo."],
    takeaway: "Mejora continua del equipo → Scrum Master como facilitador.",
  },
  {
    id: "posm-09",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "alcance",
    situation:
      "Faltan tres días para terminar el Sprint y los Developers avisan que una de las historias no va a llegar. El objetivo del Sprint todavía se puede cumplir si se ajusta el alcance.",
    question: "¿Quién negocia con los Developers cómo ajustar el alcance?",
    options: [
      { id: "a", text: "Sofía, la Product Owner, que puede aclarar o renegociar el alcance sin cambiar el objetivo.", correct: true, feedback: "Exacto. Cuando el trabajo resulta distinto de lo esperado, la Product Owner y los Developers renegocian el alcance." },
      { id: "b", text: "Martín, el Scrum Master, que decide qué ítems se sacan del Sprint.", correct: false, errorKey: "sm_prioritizes_backlog", feedback: "Decidir qué se saca implica priorizar valor: eso le corresponde a la Product Owner junto con los Developers." },
      { id: "c", text: "Martín, que le exige al equipo horas extra para cumplir todo.", correct: false, errorKey: "role_as_manager", feedback: "Exigir horas extra es una lógica de jefe tradicional; el Scrum Master cuida un ritmo sostenible." },
    ],
    hints: [PO_HINT, "Ajustar el alcance implica decidir qué es más valioso."],
    takeaway: "Renegociar alcance → Product Owner con los Developers.",
  },
  {
    id: "posm-10",
    capabilityKey: "CAP-SCRUM-03",
    level: "apply",
    family: "coaching",
    situation:
      "Se suma una Developer nueva que nunca trabajó con Scrum. Le cuesta entender para qué sirven los eventos y se siente perdida.",
    question: "¿Quién debería ayudarla a entender cómo trabaja el equipo con Scrum?",
    options: [
      { id: "a", text: "Martín, el Scrum Master, que enseña y acompaña la adopción de Scrum.", correct: true, feedback: "Bien. Enseñar Scrum y acompañar a las personas en su adopción es parte del rol del Scrum Master." },
      { id: "b", text: "Sofía, la Product Owner, porque es quien mejor conoce el producto.", correct: false, errorKey: "po_removes_impediments", feedback: "Conocer el producto no la vuelve responsable del coaching en Scrum; eso le corresponde al Scrum Master." },
      { id: "c", text: "Martín, asignándole solo tareas fáciles hasta que aprenda.", correct: false, errorKey: "role_as_manager", feedback: "El Scrum Master no asigna tareas; acompaña para que la persona se integre a la autoorganización del equipo." },
    ],
    hints: [SM_HINT, "Se trata de aprender a trabajar con Scrum, no de conocer el producto."],
    takeaway: "Enseñar y acompañar la adopción de Scrum → Scrum Master.",
  },

  // ── CAP-SCRUM-04 · Quién hace qué durante el Sprint ──────────────────────
  {
    id: "who-01",
    capabilityKey: "CAP-SCRUM-04",
    level: "apply",
    family: "como_construir",
    situation: "El equipo tiene que integrar el cobro con tarjeta en la app. Hay dos caminos técnicos posibles.",
    question: "¿Quién decide cómo se va a construir la integración?",
    options: [
      { id: "a", text: "Los Developers, que son responsables de cómo convertir el ítem en un incremento.", correct: true, feedback: "Correcto. El “cómo” es de los Developers." },
      { id: "b", text: "Sofía, la Product Owner, porque es su producto.", correct: false, errorKey: "po_assigns_tasks", feedback: "La Product Owner define qué y por qué; el cómo técnico es de los Developers." },
      { id: "c", text: "Martín, el Scrum Master, para evitar discusiones técnicas.", correct: false, errorKey: "sm_plans_for_team", feedback: "El Scrum Master no toma decisiones técnicas por el equipo." },
    ],
    hints: ["Separá el qué (producto) del cómo (construcción).", "¿Quién tiene el conocimiento técnico para elegir?"],
    takeaway: "Qué y por qué → Product Owner. Cómo → Developers.",
  },
  {
    id: "who-02",
    capabilityKey: "CAP-SCRUM-04",
    level: "apply",
    family: "estimacion",
    situation: "En la Sprint Planning hay que estimar el esfuerzo de cinco historias nuevas.",
    question: "¿Quién estima?",
    options: [
      { id: "a", text: "Los Developers que van a hacer el trabajo.", correct: true, feedback: "Exacto. Estiman quienes hacen el trabajo." },
      { id: "b", text: "Martín, el Scrum Master, porque conoce la velocidad del equipo.", correct: false, errorKey: "sm_plans_for_team", feedback: "El Scrum Master puede facilitar la estimación, pero no estima por el equipo." },
      { id: "c", text: "Sofía, la Product Owner, porque sabe cuánto valen las historias.", correct: false, errorKey: "po_assigns_tasks", feedback: "Valor y esfuerzo son cosas distintas: el esfuerzo lo estiman los Developers." },
    ],
    hints: ["¿Quién va a hacer el trabajo?", "Valor ≠ esfuerzo."],
    takeaway: "Estimar esfuerzo → Developers.",
  },
  {
    id: "who-03",
    capabilityKey: "CAP-SCRUM-04",
    level: "apply",
    family: "plan_sprint",
    situation: "Ya se eligió el objetivo del Sprint y las historias. Falta armar el plan de trabajo.",
    question: "¿Quién arma el plan para cumplir el objetivo (el Sprint Backlog)?",
    options: [
      { id: "a", text: "Los Developers, que se organizan para cumplir el objetivo.", correct: true, feedback: "Correcto. El Sprint Backlog es el plan de los Developers." },
      { id: "b", text: "Sofía, la Product Owner, que asigna las tareas a cada persona.", correct: false, errorKey: "po_assigns_tasks", feedback: "La Product Owner no asigna tareas: los Developers se autoorganizan." },
      { id: "c", text: "Martín, el Scrum Master, que reparte el trabajo para equilibrar la carga.", correct: false, errorKey: "sm_plans_for_team", feedback: "El Scrum Master no reparte el trabajo; ayuda a que el equipo se organice." },
    ],
    hints: ["¿De quién es el Sprint Backlog?", "Scrum habla de equipos que se autoorganizan."],
    takeaway: "El plan del Sprint → Developers.",
  },
  {
    id: "who-04",
    capabilityKey: "CAP-SCRUM-04",
    level: "apply",
    family: "tarea_emergente",
    situation: "A mitad del Sprint aparece una tarea técnica no prevista que hace falta para cumplir el objetivo.",
    question: "¿Quién la agrega al Sprint Backlog?",
    options: [
      { id: "a", text: "Los Developers, porque el Sprint Backlog es su plan y lo actualizan a medida que aprenden.", correct: true, feedback: "Bien. Los Developers actualizan su plan durante el Sprint." },
      { id: "b", text: "Sofía, que debe aprobar cualquier cambio en el Sprint.", correct: false, errorKey: "po_assigns_tasks", feedback: "La Product Owner no aprueba cada tarea técnica; el plan es de los Developers." },
      { id: "c", text: "Martín, que es quien administra el tablero.", correct: false, errorKey: "sm_plans_for_team", feedback: "El Scrum Master no administra el plan del equipo." },
    ],
    hints: ["La tarea no cambia el objetivo, cambia el plan.", "¿Quién es dueño del plan?"],
    takeaway: "Actualizar el plan del Sprint → Developers.",
  },

  // ── CAP-ART-01 · Product Backlog vs. Sprint Backlog ──────────────────────
  {
    id: "art-01",
    capabilityKey: "CAP-ART-01",
    level: "apply",
    family: "nueva_idea",
    situation: "El equipo de atención al cliente propone permitir reprogramar una entrega desde WhatsApp.",
    question: "¿Dónde debería registrarse esa idea?",
    options: [
      { id: "a", text: "En el Product Backlog, para que la Product Owner la evalúe y la ordene.", correct: true, feedback: "Correcto. Las ideas nuevas entran al Product Backlog." },
      { id: "b", text: "En el Sprint Backlog actual, para no perderla.", correct: false, errorKey: "backlogs_same_list", feedback: "El Sprint Backlog es el plan del Sprint en curso, no un depósito de ideas." },
      { id: "c", text: "Sofía la agrega directamente al Sprint Backlog.", correct: false, errorKey: "sprint_backlog_owned_by_po", feedback: "La Product Owner no modifica el Sprint Backlog; ordena el Product Backlog." },
    ],
    hints: ["Una lista es de todo el producto, la otra es del Sprint actual.", "¿La idea ya está comprometida para este Sprint?"],
    takeaway: "Ideas nuevas → Product Backlog.",
  },
  {
    id: "art-02",
    capabilityKey: "CAP-ART-01",
    level: "apply",
    family: "dueno",
    situation: "En una charla de pasillo alguien pregunta de quién es el Sprint Backlog.",
    question: "¿Qué respondés?",
    options: [
      { id: "a", text: "De los Developers: es su plan para cumplir el objetivo del Sprint.", correct: true, feedback: "Exacto." },
      { id: "b", text: "De la Product Owner, como todo lo que es backlog.", correct: false, errorKey: "sprint_backlog_owned_by_po", feedback: "La Product Owner es responsable del Product Backlog, no del Sprint Backlog." },
      { id: "c", text: "Es la misma lista que el Product Backlog, solo que filtrada.", correct: false, errorKey: "backlogs_same_list", feedback: "Son artefactos distintos, con propósitos y responsables distintos." },
    ],
    hints: ["Pensá en el plan del Sprint.", "Cada artefacto tiene un responsable distinto."],
    takeaway: "Sprint Backlog → Developers. Product Backlog → Product Owner.",
  },
  {
    id: "art-03",
    capabilityKey: "CAP-ART-01",
    level: "apply",
    family: "contenido",
    situation: "Un compañero nuevo abre el tablero y ve dos listas. Te pregunta qué contiene el Sprint Backlog.",
    question: "¿Qué contiene?",
    options: [
      { id: "a", text: "El objetivo del Sprint, los ítems elegidos y el plan para entregarlos.", correct: true, feedback: "Correcto." },
      { id: "b", text: "Todos los ítems pendientes del producto.", correct: false, errorKey: "backlogs_same_list", feedback: "Eso es el Product Backlog." },
      { id: "c", text: "Lo que la Product Owner decida durante el Sprint.", correct: false, errorKey: "sprint_backlog_owned_by_po", feedback: "El Sprint Backlog lo gestionan los Developers." },
    ],
    hints: ["Incluye el porqué del Sprint.", "No es todo lo pendiente."],
    takeaway: "Sprint Backlog = objetivo + ítems elegidos + plan.",
  },
  {
    id: "art-04",
    capabilityKey: "CAP-ART-01",
    level: "apply",
    family: "cambios",
    situation: "A mitad del Sprint, Sofía quiere reordenar el Product Backlog pensando en el próximo Sprint.",
    question: "¿Puede hacerlo?",
    options: [
      { id: "a", text: "Sí: puede reordenar el Product Backlog en cualquier momento, sin cambiar el Sprint en curso.", correct: true, feedback: "Bien. El Product Backlog evoluciona continuamente." },
      { id: "b", text: "No: el Product Backlog queda congelado durante el Sprint.", correct: false, errorKey: "backlogs_same_list", feedback: "Lo que se protege durante el Sprint es el objetivo del Sprint, no el Product Backlog." },
      { id: "c", text: "Sí, y además cambia lo que el equipo está haciendo en este Sprint.", correct: false, errorKey: "sprint_backlog_owned_by_po", feedback: "Reordenar el Product Backlog no cambia el plan actual de los Developers." },
    ],
    hints: ["¿Qué se protege durante un Sprint?", "Una lista es viva; la otra es el compromiso actual."],
    takeaway: "Product Backlog: vivo y ordenado por la PO. Sprint Backlog: plan del Sprint en curso.",
  },

  // ── CAP-EV-01 · Sprint Planning ──────────────────────────────────────────
  {
    id: "plan-01",
    capabilityKey: "CAP-EV-01",
    level: "apply",
    family: "objetivo",
    situation: "Empieza la Sprint Planning. Sofía trae diez historias ordenadas.",
    question: "¿Por dónde conviene empezar?",
    options: [
      { id: "a", text: "Acordar un objetivo del Sprint que explique por qué este Sprint es valioso.", correct: true, feedback: "Correcto. El objetivo da sentido a la selección de ítems." },
      { id: "b", text: "Repartir las diez historias entre los Developers.", correct: false, errorKey: "planning_without_goal", feedback: "Sin objetivo, el Sprint es solo una lista de tareas." },
      { id: "c", text: "Que Sofía arme sola el plan y lo comparta.", correct: false, errorKey: "planning_by_po_alone", feedback: "La planificación es colaborativa con los Developers." },
    ],
    hints: ["¿Qué le da sentido a un Sprint?", "Primero el porqué, después el qué."],
    takeaway: "Sprint Planning empieza por el objetivo.",
  },
  {
    id: "plan-02",
    capabilityKey: "CAP-EV-01",
    level: "apply",
    family: "seleccion",
    situation: "El objetivo es “que los repartidores puedan reportar incidentes desde la app”. Quedan ítems sin relación con ese objetivo.",
    question: "¿Qué hacen con esos ítems?",
    options: [
      { id: "a", text: "Priorizan lo que aporta al objetivo y dejan el resto en el Product Backlog.", correct: true, feedback: "Bien." },
      { id: "b", text: "Los suman igual para aprovechar el Sprint al máximo.", correct: false, errorKey: "planning_without_goal", feedback: "Llenar el Sprint diluye el objetivo." },
      { id: "c", text: "Sofía decide sola qué entra sin consultar capacidad.", correct: false, errorKey: "planning_by_po_alone", feedback: "La selección considera la capacidad que estiman los Developers." },
    ],
    hints: ["El objetivo funciona como filtro.", "¿Quién conoce la capacidad del equipo?"],
    takeaway: "El objetivo del Sprint filtra qué entra.",
  },

  // ── CAP-EV-02 · Retrospectiva ────────────────────────────────────────────
  {
    id: "retro-01",
    capabilityKey: "CAP-EV-02",
    level: "apply",
    family: "foco",
    situation: "En la retrospectiva, alguien dice que el Sprint salió mal “por culpa de Joaquín”.",
    question: "¿Cómo conviene reencauzar la conversación?",
    options: [
      { id: "a", text: "Llevar la discusión a qué del proceso falló y qué podemos cambiar como equipo.", correct: true, feedback: "Correcto. La retro mira el proceso, no culpables." },
      { id: "b", text: "Dejar que el equipo defina la responsabilidad de Joaquín.", correct: false, errorKey: "retro_as_blame", feedback: "Buscar culpables rompe la seguridad del equipo." },
      { id: "c", text: "Cerrar el tema y pasar a la próxima reunión.", correct: false, errorKey: "retro_without_actions", feedback: "Evitar el tema no produce mejoras." },
    ],
    hints: ["La retro es sobre el proceso.", "¿Qué podemos cambiar nosotros?"],
    takeaway: "Retro: proceso y mejoras, no culpables.",
  },
  {
    id: "retro-02",
    capabilityKey: "CAP-EV-02",
    level: "apply",
    family: "cierre",
    situation: "La retro identificó tres problemas. Quedan 10 minutos.",
    question: "¿Qué conviene hacer?",
    options: [
      { id: "a", text: "Elegir una o dos mejoras concretas, con responsable y forma de verificarlas.", correct: true, feedback: "Bien." },
      { id: "b", text: "Anotar los tres problemas y revisarlos en la próxima retro.", correct: false, errorKey: "retro_without_actions", feedback: "Sin acciones, los problemas se repiten." },
      { id: "c", text: "Identificar quién causó cada problema.", correct: false, errorKey: "retro_as_blame", feedback: "El foco son mejoras, no responsables individuales." },
    ],
    hints: ["Una retro termina en acciones.", "Mejor pocas acciones que muchas ideas."],
    takeaway: "Retro útil = pocas mejoras concretas y verificables.",
  },

  // ── Nivel explicar (diagnósticos breves) ─────────────────────────────────
  {
    id: "sprint-01",
    capabilityKey: "CAP-SPRINT-01",
    level: "explain",
    family: "sprint",
    situation: "Un amigo te pregunta qué es un Sprint.",
    question: "¿Cuál es la mejor explicación?",
    options: [
      { id: "a", text: "Un período fijo y corto en el que el equipo construye un incremento valioso hacia un objetivo.", correct: true, feedback: "Correcto." },
      { id: "b", text: "Una reunión de seguimiento del proyecto.", correct: false, feedback: "Eso describe un evento, no el Sprint." },
      { id: "c", text: "Una fase del proyecto que dura lo necesario hasta terminar todo.", correct: false, feedback: "El Sprint tiene una duración fija." },
    ],
    hints: ["Tiene duración fija.", "Produce algo usable."],
    takeaway: "Sprint = ciclo de duración fija que produce un incremento.",
  },
  {
    id: "sprint-02",
    capabilityKey: "CAP-SPRINT-01",
    level: "explain",
    family: "sprint_eventos",
    situation: "Tenés que ordenar los momentos de un Sprint.",
    question: "¿Cuál es el orden correcto?",
    options: [
      { id: "a", text: "Planning → Dailies → Review → Retrospectiva.", correct: true, feedback: "Correcto." },
      { id: "b", text: "Review → Planning → Retrospectiva → Dailies.", correct: false, feedback: "La Review y la Retro ocurren al final." },
      { id: "c", text: "Dailies → Planning → Retrospectiva → Review.", correct: false, feedback: "Todo empieza con la Planning." },
    ],
    hints: ["Todo empieza planificando.", "Primero se revisa el producto, después el proceso."],
    takeaway: "Planning → Dailies → Review → Retro.",
  },
  {
    id: "po-01",
    capabilityKey: "CAP-SCRUM-01",
    level: "explain",
    family: "po",
    situation: "Te piden resumir el rol del Product Owner.",
    question: "¿Qué resume mejor su responsabilidad?",
    options: [
      { id: "a", text: "Maximizar el valor del producto y ordenar el Product Backlog.", correct: true, feedback: "Correcto." },
      { id: "b", text: "Coordinar las reuniones del equipo.", correct: false, feedback: "Eso se acerca más a la facilitación del Scrum Master." },
      { id: "c", text: "Asignar las tareas a los Developers.", correct: false, feedback: "En Scrum nadie asigna tareas: los Developers se autoorganizan." },
    ],
    hints: ["Pensá en valor.", "¿Quién ordena el Product Backlog?"],
    takeaway: "PO = valor del producto + orden del Product Backlog.",
  },
  {
    id: "sm-01",
    capabilityKey: "CAP-SCRUM-02",
    level: "explain",
    family: "sm",
    situation: "Te piden resumir el rol del Scrum Master.",
    question: "¿Qué resume mejor su responsabilidad?",
    options: [
      { id: "a", text: "Ayudar al equipo y a la organización a usar Scrum y remover impedimentos.", correct: true, feedback: "Correcto." },
      { id: "b", text: "Decidir las prioridades del producto.", correct: false, feedback: "Eso es del Product Owner." },
      { id: "c", text: "Controlar que cada persona cumpla sus tareas.", correct: false, feedback: "El Scrum Master no es un jefe de control." },
    ],
    hints: ["Pensá en facilitación.", "¿Quién saca obstáculos?"],
    takeaway: "SM = facilitar Scrum, coaching y remover impedimentos.",
  },
];

export function bankFor(capabilityKey: string): BankScenario[] {
  return SCENARIO_BANK.filter((s) => s.capabilityKey === capabilityKey);
}

export function scenarioById(id: string): BankScenario | undefined {
  return SCENARIO_BANK.find((s) => s.id === id);
}

/** Capacidades con suficientes escenarios para una práctica individual o un lanzamiento. */
export function hasPracticeBank(capabilityKey: string): boolean {
  return bankFor(capabilityKey).length >= 3;
}
