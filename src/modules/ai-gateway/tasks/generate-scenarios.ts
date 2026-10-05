import "server-only";
import { z } from "zod";
import type { DB } from "@/db/client";
import type { CapabilityRecord } from "@/modules/curriculum/service";
import type { ScenarioInput } from "@/modules/experience/planner";
import { invokeStructured } from "../gateway";

/**
 * Tarea `experience.generate_decision_scenarios` (TA eval: experience_spec_eval).
 * Produce contenido declarativo, nunca código. Las quality gates del planner se aplican después.
 */
export const GENERATE_SCENARIOS_PROMPT_VERSION = "generate-scenarios@1.0.0";

const Schema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().min(10).max(300),
  organization: z.string().min(2).max(80),
  intro: z.string().min(20).max(600),
  steps: z
    .array(
      z.object({
        family: z.string().min(2).max(40),
        situation: z.string().min(20).max(900),
        question: z.string().min(5).max(250),
        options: z
          .array(
            z.object({
              text: z.string().min(3).max(300),
              correct: z.boolean(),
              error_key: z.string().nullable(),
              feedback: z.string().min(10).max(400),
            }),
          )
          .min(3)
          .max(4),
        hints: z.array(z.string().min(5).max(300)).min(1).max(2),
        takeaway: z.string().min(10).max(300),
      }),
    )
    .min(3)
    .max(6),
});

export async function generateScenariosWithAI(args: {
  db: DB | null;
  courseSectionId: string;
  capability: CapabilityRecord;
  subjectName: string;
  count: number;
  targetErrorKeys: string[];
  examples: ScenarioInput[];
  contextHint?: string;
  teacherInstruction?: string | null;
}): Promise<{ title: string; description: string; organization: string; intro: string; scenarios: ScenarioInput[] } | null> {
  const cap = args.capability;
  const catalog = cap.knownErrorTypes.map((e) => `- ${e.key}: ${e.label}`).join("\n");
  const examples = args.examples
    .slice(0, 2)
    .map((e) => JSON.stringify({ situation: e.situation, question: e.question, options: e.options, takeaway: e.takeaway }))
    .join("\n");
  const res = await invokeStructured({
    db: args.db,
    task: "experience.generate_decision_scenarios",
    promptVersion: GENERATE_SCENARIOS_PROMPT_VERSION,
    courseSectionId: args.courseSectionId,
    effort: "medium",
    maxTokens: 12000,
    timeoutMs: 90_000,
    system:
      "Diseñás experiencias de aprendizaje para Educai. Generás situaciones de decisión breves y realistas para estudiantes universitarios argentinos (voseo, español claro). " +
      "Cada situación es una oportunidad independiente de observar la capacidad: una sola opción es adecuada; cada opción incorrecta debe revelar un error del catálogo (error_key) y su feedback explica por qué, sin retar. " +
      "Las situaciones deben requerir aplicar el criterio, no recordar definiciones. Las pistas orientan sin revelar la respuesta. Sin datos personales reales.",
    user: [
      `<materia>${args.subjectName}</materia>`,
      `<capacidad nivel="${cap.targetCognitiveLevel}">${cap.statement}</capacidad>`,
      `<catalogo_errores>\n${catalog || "(sin catálogo: usá error_key null)"}\n</catalogo_errores>`,
      `<errores_prioritarios>${args.targetErrorKeys.join(", ") || "ninguno"}</errores_prioritarios>`,
      `<cantidad>${args.count}</cantidad>`,
      args.contextHint ? `<contexto_aula>${args.contextHint}</contexto_aula>` : "",
      args.teacherInstruction ? `<indicacion_docente>${args.teacherInstruction}</indicacion_docente>` : "",
      examples ? `<ejemplos_de_estilo>\n${examples}\n</ejemplos_de_estilo>` : "",
      "Las situaciones nuevas no deben repetir los ejemplos.",
    ]
      .filter(Boolean)
      .join("\n"),
    schema: Schema,
    validate: (d) => {
      const keys = new Set(cap.knownErrorTypes.map((e) => e.key));
      for (const s of d.steps) {
        if (s.options.filter((o) => o.correct).length !== 1) return "cada situación necesita una única opción correcta";
        if (keys.size && s.options.some((o) => !o.correct && o.error_key && !keys.has(o.error_key))) return "error_key fuera de catálogo";
      }
      return null;
    },
  });
  if (!res.ok) return null;
  const stamp = Date.now().toString(36);
  return {
    title: res.data.title,
    description: res.data.description,
    organization: res.data.organization,
    intro: res.data.intro,
    scenarios: res.data.steps.slice(0, args.count).map((s, i) => ({
      scenarioKey: `ai-${cap.stableKey}-${stamp}-${i + 1}`,
      family: s.family,
      level: cap.targetCognitiveLevel,
      situation: s.situation,
      question: s.question,
      options: s.options.map((o) => ({ text: o.text, correct: o.correct, errorKey: o.correct ? null : o.error_key, feedback: o.feedback })),
      hints: s.hints,
      takeaway: s.takeaway,
    })),
  };
}
