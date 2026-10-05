import type { CognitiveLevel } from "@/modules/shared/enums";

/**
 * Contenido del tutor para cuando no hay modelo disponible (fallback determinista) y
 * consignas de "Ahora probalo por tu cuenta" para las capacidades de la cátedra demo.
 */

export type TutorScript = {
  intro: string;
  contrast: string;
  example: string;
  probe: { question: string; level: CognitiveLevel };
  transferProbe?: { question: string; level: CognitiveLevel };
};

export const TUTOR_SCRIPTS: Record<string, TutorScript> = {
  "CAP-SCRUM-03": {
    intro:
      "Veamos Product Owner y Scrum Master desde las decisiones, no desde las definiciones. Una pregunta guía ayuda mucho: ¿la situación es sobre QUÉ construir o sobre CÓMO trabaja el equipo?",
    contrast:
      "Si la pregunta es sobre qué tiene más valor, qué entra al backlog o en qué orden, decide la Product Owner. Si es sobre cómo trabaja el equipo (un evento que no funciona, un conflicto, un impedimento que lo frena), interviene el Scrum Master. El Scrum Master puede facilitar una conversación sobre prioridades, pero no la decide; y la Product Owner no se ocupa de remover impedimentos del equipo.",
    example:
      "Ejemplo: un cliente importante pide una función urgente y se lo dice al Scrum Master. El Scrum Master no la prioriza: la lleva a la Product Owner, que decide si entra y con qué prioridad. Otro: el equipo no puede publicar porque otra área no da acceso a un servidor. Ahí actúa el Scrum Master, porque es un impedimento que frena al equipo.",
    probe: {
      question:
        "En Rutas Verdes, un inversor le escribe al Scrum Master pidiendo que el equipo deje de lado lo planificado para armar un panel de métricas. Al mismo tiempo, dos Developers no avanzan porque esperan una aprobación de seguridad hace días. ¿Qué le corresponde a la Product Owner y qué al Scrum Master en esta situación? Explicá por qué.",
      level: "apply",
    },
    transferProbe: {
      question:
        "Imaginá una ONG que organiza campañas de donación y empieza a trabajar con Scrum. Llegan pedidos de varias áreas sobre qué campaña lanzar primero, y el equipo se traba porque nadie consigue los permisos para usar la base de donantes. ¿Quién debería decidir qué campaña va primero y quién debería ocuparse del permiso? Explicá tu razonamiento.",
      level: "transfer",
    },
  },
  "CAP-ART-01": {
    intro: "Pensemos los dos backlogs como dos listas con dueños y propósitos distintos.",
    contrast:
      "El Product Backlog es la lista ordenada de todo lo que podría mejorar el producto; lo ordena la Product Owner y cambia todo el tiempo. El Sprint Backlog es el plan de este Sprint: el objetivo, los ítems elegidos y cómo se van a hacer. Es de los Developers.",
    example: "Si atención al cliente propone una idea nueva, va al Product Backlog. Si durante el Sprint aparece una tarea técnica necesaria para el objetivo, los Developers la suman al Sprint Backlog.",
    probe: { question: "Explicá con tus palabras en qué se diferencian el Product Backlog y el Sprint Backlog: qué contiene cada uno y quién es responsable.", level: "explain" },
  },
  "CAP-EV-01": {
    intro: "La Sprint Planning arranca por el porqué del Sprint.",
    contrast: "Primero se acuerda un objetivo de Sprint que explique por qué este Sprint es valioso. Después se eligen los ítems que aportan a ese objetivo y los Developers arman el plan.",
    example: "Si el objetivo es que los repartidores reporten incidentes desde la app, los ítems que no aportan a eso quedan en el Product Backlog aunque haya capacidad.",
    probe: { question: "Explicá con tus palabras cómo planificarías un Sprint en Rutas Verdes: por dónde empezarías y cómo decidirías qué entra.", level: "explain" },
  },
  "CAP-EV-02": {
    intro: "Una retrospectiva sirve si termina en mejoras concretas.",
    contrast: "La retro mira el proceso del equipo, no a culpables. Se identifican problemas y se eligen una o dos mejoras con responsable y forma de verificarlas.",
    example: "Si las historias llegan poco claras, una mejora concreta puede ser: “antes de la Planning, la PO y un Developer revisan juntos los criterios de aceptación”.",
    probe: { question: "Explicá con tus palabras qué harías para que una retrospectiva termine en mejoras concretas y no en quejas repetidas.", level: "explain" },
  },
};

export function genericScript(statement: string, shortLabel: string, level: CognitiveLevel): TutorScript {
  return {
    intro: `Trabajemos “${shortLabel}”. El objetivo es: ${statement.charAt(0).toLowerCase()}${statement.slice(1)}.`,
    contrast: `Para ${shortLabel.toLowerCase()}, conviene separar qué es, para qué sirve y en qué situación se usa. Pensá un caso concreto de un proyecto que conozcas y preguntate qué cambiaría si no lo aplicaras.`,
    example: "Probá describir una situación real y qué decisión tomarías. Con un ejemplo propio se ve mejor qué parte está clara y cuál no.",
    probe: { question: `Explicá con tus palabras: ${statement.charAt(0).toLowerCase()}${statement.slice(1)}. Usá un ejemplo concreto.`, level: level === "recognize" ? "explain" : level },
  };
}
