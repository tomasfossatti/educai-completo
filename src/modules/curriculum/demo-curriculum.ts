import type { KnownErrorType } from "@/db/schema/curriculum";
import type { CognitiveLevel, Importance } from "@/modules/shared/enums";

/**
 * Currícula de la cátedra demo. Las capacidades de Roles Scrum siguen CAP-SCRUM-01..06
 * del Curriculum Model (C:281-324). El resto completa la Unidad 2 y su contexto.
 */

export type DemoCapability = {
  key: string;
  statement: string;
  shortLabel: string;
  studentExplanation: string;
  actionVerb: string;
  level: CognitiveLevel;
  importance: Importance;
  plannedClassNo: number;
  prerequisites?: string[];
  errors?: KnownErrorType[];
  keywords: string[];
};

export type DemoTopic = { key: string; title: string; plannedClassNo: number; capabilities: DemoCapability[] };
export type DemoUnit = { key: string; title: string; description: string; plannedClassNo: number; topics: DemoTopic[] };
export type DemoModule = { key: string; title: string; units: DemoUnit[] };

export const SCRUM_ROLE_ERRORS: KnownErrorType[] = [
  {
    key: "sm_prioritizes_backlog",
    label: "Le asigna al Scrum Master decisiones sobre qué entra o qué prioridad tiene el backlog",
    studentLabel: "le asignaste al Scrum Master decisiones sobre qué entra o qué prioridad tiene el backlog",
    description: "Confunde la facilitación del Scrum Master con la responsabilidad del Product Owner sobre el orden y el contenido del Product Backlog.",
  },
  {
    key: "po_removes_impediments",
    label: "Le asigna al Product Owner la facilitación o la remoción de impedimentos",
    studentLabel: "le asignaste a la Product Owner la facilitación o la remoción de impedimentos",
    description: "Atribuye al Product Owner tareas de facilitación, coaching o remoción de impedimentos que corresponden al Scrum Master.",
  },
  {
    key: "role_as_manager",
    label: "Trata a un rol de Scrum como un jefe que asigna o controla tareas",
    studentLabel: "trataste a un rol de Scrum como un jefe que asigna o controla tareas",
    description: "Interpreta al Scrum Master o al Product Owner como un gerente tradicional que reparte trabajo o decide por el equipo.",
  },
  {
    key: "stakeholder_overrides_po",
    label: "Deja que un stakeholder decida la prioridad por encima del Product Owner",
    studentLabel: "dejaste que alguien externo decidiera la prioridad por encima de la Product Owner",
    description: "Acepta que quien pide una funcionalidad defina directamente su prioridad, salteando al Product Owner.",
  },
];

export const DEMO_SUBJECT = {
  name: "Innovación de Procesos y Diseño de Proyectos",
  code: "IPDP",
  description: "Herramientas para rediseñar procesos y gestionar proyectos con marcos ágiles.",
};

export const DEMO_CURRICULUM: DemoModule[] = [
  {
    key: "M1",
    title: "Gestión de proyectos e innovación",
    units: [
      {
        key: "U1",
        title: "Unidad 1 · Innovación de procesos",
        description: "Entender cómo funciona un proceso antes de cambiarlo.",
        plannedClassNo: 1,
        topics: [
          {
            key: "T1.1",
            title: "Mapeo de procesos",
            plannedClassNo: 1,
            capabilities: [
              {
                key: "CAP-PROC-01",
                statement: "Mapear un proceso actual (AS-IS) identificando actores, pasos y decisiones",
                shortLabel: "Mapeo AS-IS",
                studentExplanation: "Representar cómo funciona hoy un proceso, sin mezclarlo con cómo debería funcionar.",
                actionVerb: "Mapear",
                level: "apply",
                importance: "medium",
                plannedClassNo: 1,
                keywords: ["as-is", "mapa de proceso", "diagrama", "actores"],
              },
            ],
          },
          {
            key: "T1.2",
            title: "Cuellos de botella",
            plannedClassNo: 2,
            capabilities: [
              {
                key: "CAP-PROC-02",
                statement: "Identificar cuellos de botella en un proceso a partir de su mapa",
                shortLabel: "Cuellos de botella",
                studentExplanation: "Encontrar el paso que limita el ritmo de todo el proceso.",
                actionVerb: "Identificar",
                level: "apply",
                importance: "medium",
                plannedClassNo: 2,
                prerequisites: ["CAP-PROC-01"],
                keywords: ["cuello de botella", "restricción", "espera"],
              },
            ],
          },
        ],
      },
      {
        key: "U2",
        title: "Unidad 2 · Scrum",
        description: "Organizar el trabajo de un equipo en ciclos cortos con roles claros.",
        plannedClassNo: 3,
        topics: [
          {
            key: "T2.1",
            title: "Framework y Sprint",
            plannedClassNo: 3,
            capabilities: [
              {
                key: "CAP-SPRINT-01",
                statement: "Explicar cómo se organiza un Sprint",
                shortLabel: "Cómo funciona un Sprint",
                studentExplanation: "Contar con tus palabras qué pasa en un Sprint, de la planificación a la retrospectiva.",
                actionVerb: "Explicar",
                level: "explain",
                importance: "high",
                plannedClassNo: 3,
                keywords: ["sprint", "timebox", "incremento", "objetivo del sprint"],
              },
            ],
          },
          {
            key: "T2.2",
            title: "Roles Scrum",
            plannedClassNo: 3,
            capabilities: [
              {
                key: "CAP-SCRUM-01",
                statement: "Explicar las responsabilidades del Product Owner",
                shortLabel: "Responsabilidades del Product Owner",
                studentExplanation: "Explicar qué decide y de qué responde el Product Owner.",
                actionVerb: "Explicar",
                level: "explain",
                importance: "high",
                plannedClassNo: 3,
                keywords: ["product owner", "po", "valor", "priorizar", "product backlog"],
              },
              {
                key: "CAP-SCRUM-02",
                statement: "Explicar las responsabilidades del Scrum Master",
                shortLabel: "Responsabilidades del Scrum Master",
                studentExplanation: "Explicar cómo el Scrum Master ayuda al equipo y a la organización a trabajar con Scrum.",
                actionVerb: "Explicar",
                level: "explain",
                importance: "high",
                plannedClassNo: 3,
                keywords: ["scrum master", "sm", "facilitar", "impedimentos", "coaching"],
              },
              {
                key: "CAP-SCRUM-03",
                statement: "Diferenciar las responsabilidades del Product Owner y del Scrum Master en situaciones concretas",
                shortLabel: "Product Owner vs. Scrum Master",
                studentExplanation:
                  "Decidir, frente a una situación real, si le corresponde al Product Owner o al Scrum Master. No alcanza con conocer las definiciones: hay que aplicarlas cuando la situación es ambigua.",
                actionVerb: "Diferenciar",
                level: "apply",
                importance: "critical",
                plannedClassNo: 3,
                prerequisites: ["CAP-SCRUM-01", "CAP-SCRUM-02"],
                errors: SCRUM_ROLE_ERRORS,
                keywords: ["product owner", "scrum master", "po", "sm", "roles", "responsabilidad", "priorizar", "impedimento"],
              },
              {
                key: "CAP-SCRUM-04",
                statement: "Asignar correctamente responsabilidades frente a situaciones de un Sprint",
                shortLabel: "Quién hace qué durante el Sprint",
                studentExplanation: "Saber quién estima, quién planifica y quién decide cómo se construye durante el Sprint.",
                actionVerb: "Asignar",
                level: "apply",
                importance: "high",
                plannedClassNo: 4,
                prerequisites: ["CAP-SCRUM-03"],
                errors: [
                  { key: "po_assigns_tasks", studentLabel: "le asignaste a la Product Owner decisiones de cómo construir o a quién asignar tareas", label: "Cree que el Product Owner asigna tareas o decide cómo construir", description: "Atribuye al Product Owner decisiones técnicas o de asignación que corresponden a los Developers." },
                  { key: "sm_plans_for_team", studentLabel: "le asignaste al Scrum Master la estimación o el plan del equipo", label: "Cree que el Scrum Master estima o planifica por el equipo", description: "Atribuye al Scrum Master la estimación o el plan del Sprint, que son de los Developers." },
                ],
                keywords: ["developers", "estimar", "sprint backlog", "tareas"],
              },
              {
                key: "CAP-SCRUM-05",
                statement: "Resolver situaciones ambiguas donde intervienen ambos roles",
                shortLabel: "Situaciones ambiguas entre roles",
                studentExplanation: "Resolver casos donde la respuesta no es obvia y hay que coordinar a más de un rol.",
                actionVerb: "Resolver",
                level: "solve",
                importance: "high",
                plannedClassNo: 5,
                prerequisites: ["CAP-SCRUM-03"],
                keywords: ["ambiguo", "conflicto", "roles"],
              },
              {
                key: "CAP-SCRUM-06",
                statement: "Aplicar la separación de responsabilidades a un contexto ágil nuevo",
                shortLabel: "Roles en un contexto nuevo",
                studentExplanation: "Llevar el criterio de los roles a un equipo o industria distintos a los vistos en clase.",
                actionVerb: "Transferir",
                level: "transfer",
                importance: "medium",
                plannedClassNo: 6,
                prerequisites: ["CAP-SCRUM-05"],
                keywords: ["transferir", "contexto nuevo"],
              },
            ],
          },
          {
            key: "T2.3",
            title: "Artefactos Scrum",
            plannedClassNo: 3,
            capabilities: [
              {
                key: "CAP-ART-01",
                statement: "Diferenciar el Product Backlog y el Sprint Backlog",
                shortLabel: "Product Backlog vs. Sprint Backlog",
                studentExplanation: "Saber qué contiene cada backlog, quién es responsable y cuándo cambia.",
                actionVerb: "Diferenciar",
                level: "apply",
                importance: "high",
                plannedClassNo: 3,
                errors: [
                  { key: "backlogs_same_list", studentLabel: "trataste el Product Backlog y el Sprint Backlog como la misma lista", label: "Trata el Product Backlog y el Sprint Backlog como la misma lista", description: "No distingue la lista ordenada de todo el producto del plan del Sprint actual." },
                  { key: "sprint_backlog_owned_by_po", studentLabel: "pensaste que la Product Owner decide el contenido del Sprint Backlog", label: "Cree que el Product Owner decide el contenido del Sprint Backlog", description: "Atribuye al Product Owner el plan del Sprint, que pertenece a los Developers." },
                ],
                keywords: ["product backlog", "sprint backlog", "artefacto", "lista"],
              },
            ],
          },
          {
            key: "T2.4",
            title: "Eventos Scrum",
            plannedClassNo: 4,
            capabilities: [
              {
                key: "CAP-EV-01",
                statement: "Aplicar Sprint Planning para definir un objetivo de Sprint",
                shortLabel: "Sprint Planning",
                studentExplanation: "Planificar un Sprint empezando por el objetivo, no por la lista de tareas.",
                actionVerb: "Aplicar",
                level: "apply",
                importance: "medium",
                plannedClassNo: 4,
                errors: [
                  { key: "planning_without_goal", studentLabel: "planificaste tareas sin definir un objetivo de Sprint", label: "Planifica tareas sin definir un objetivo de Sprint", description: "Arma la lista de trabajo sin un objetivo que le dé sentido." },
                  { key: "planning_by_po_alone", studentLabel: "dejaste la planificación solo en manos de la Product Owner", label: "Cree que el Product Owner planifica solo el Sprint", description: "Deja afuera a los Developers de la planificación." },
                ],
                keywords: ["sprint planning", "planificación", "objetivo"],
              },
              {
                key: "CAP-EV-02",
                statement: "Facilitar una Retrospectiva que termine en mejoras concretas",
                shortLabel: "Retrospectiva",
                studentExplanation: "Usar la retrospectiva para acordar mejoras concretas del equipo, no para buscar culpables.",
                actionVerb: "Facilitar",
                level: "apply",
                importance: "medium",
                plannedClassNo: 4,
                errors: [
                  { key: "retro_as_blame", studentLabel: "usaste la retrospectiva para buscar culpables", label: "Usa la retrospectiva para buscar culpables", description: "Centra la retrospectiva en responsables individuales en lugar de mejoras del proceso." },
                  { key: "retro_without_actions", studentLabel: "cerraste la retrospectiva sin acciones concretas", label: "Cierra la retrospectiva sin acciones concretas", description: "Identifica problemas pero no acuerda qué cambiar." },
                ],
                keywords: ["retrospectiva", "mejora continua", "retro"],
              },
            ],
          },
        ],
      },
      {
        key: "U3",
        title: "Unidad 3 · Kanban y flujo",
        description: "Visualizar el trabajo y limitarlo para que fluya.",
        plannedClassNo: 7,
        topics: [
          {
            key: "T3.1",
            title: "Tablero Kanban",
            plannedClassNo: 7,
            capabilities: [
              {
                key: "CAP-KAN-01",
                statement: "Visualizar el flujo de trabajo en un tablero Kanban",
                shortLabel: "Tablero Kanban",
                studentExplanation: "Representar las etapas del trabajo para ver dónde se acumula.",
                actionVerb: "Visualizar",
                level: "apply",
                importance: "medium",
                plannedClassNo: 7,
                keywords: ["kanban", "tablero", "flujo"],
              },
              {
                key: "CAP-KAN-02",
                statement: "Limitar el trabajo en curso (WIP) para mejorar el flujo",
                shortLabel: "Límites WIP",
                studentExplanation: "Decidir cuánto trabajo puede estar en curso a la vez.",
                actionVerb: "Limitar",
                level: "apply",
                importance: "medium",
                plannedClassNo: 8,
                prerequisites: ["CAP-KAN-01"],
                keywords: ["wip", "límite", "flujo"],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const CLASS_TITLES = [
  "Presentación y mapeo de procesos",
  "Cuellos de botella y rediseño",
  "Scrum: framework, roles y artefactos",
  "Eventos Scrum y roles en la práctica",
  "Roles en situaciones ambiguas",
  "Repaso integrador",
  "Kanban: visualizar el flujo",
  "Límites WIP y métricas de flujo",
  "Taller de proyecto",
  "Presentación de proyectos",
  "Cierre y retroalimentación",
];

/** Programa de ejemplo para el wizard "Crear cátedra" (texto plano equivalente a un PDF de programa). */
export const SAMPLE_PROGRAM_TEXT = `PROGRAMA — GESTIÓN ÁGIL DE PROYECTOS

Objetivo general: que los estudiantes puedan organizar el trabajo de un equipo con marcos ágiles.

Unidad 1: Fundamentos de la agilidad
- Manifiesto ágil y sus principios
- Diferencias entre gestión predictiva y adaptativa

Unidad 2: Scrum
- Roles: Product Owner, Scrum Master y Developers
- Eventos: Sprint, Sprint Planning, Daily, Review y Retrospectiva
- Artefactos: Product Backlog, Sprint Backlog e Incremento

Unidad 3: Kanban
- Visualización del flujo de trabajo
- Límites de trabajo en curso (WIP)
- Métricas de flujo: lead time y throughput
`;
