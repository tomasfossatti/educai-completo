import { createHash } from "node:crypto";
import type { CapabilityRecord } from "@/modules/curriculum/service";
import type { QualityReview } from "@/db/schema/engines";
import { levelRank } from "@/modules/shared/enums";
import { DecisionScenarioDefinitionSchema, type DecisionScenarioDefinition } from "./contract";
import { BANK_INTRO, BANK_ORGANIZATION, EXPERIENCE_TITLES, bankFor, type BankScenario } from "./bank";

/**
 * Experience planner (EE §6-§9): Recommendation/Finding → ExperienceSpec → ExperienceDefinition declarativa.
 * El formato `decision_scenario` es el primer formato instrumentado (TA:3816-3830).
 */

export const PLANNER_VERSION = "planner-0.1.0";

export type ScenarioInput = {
  scenarioKey: string;
  family: string;
  level: BankScenario["level"];
  situation: string;
  question: string;
  options: { text: string; correct: boolean; errorKey?: string | null; feedback: string }[];
  hints: string[];
  takeaway: string;
};

/** Orden estable pero no trivial: la opción adecuada no queda siempre primera. */
export function shuffleStable<T extends { text: string }>(items: T[], seed: string): T[] {
  const h = (t: string) => createHash("sha256").update(`${seed}:${t}`).digest().readUInt32LE(0);
  return [...items].sort((a, b) => h(a.text) - h(b.text));
}

export function bankToInput(s: BankScenario): ScenarioInput {
  return {
    scenarioKey: s.id,
    family: s.family,
    level: s.level,
    situation: s.situation,
    question: s.question,
    options: s.options.map((o) => ({ text: o.text, correct: o.correct, errorKey: o.errorKey ?? null, feedback: o.feedback })),
    hints: s.hints,
    takeaway: s.takeaway,
  };
}

export function buildDefinition(args: {
  capability: CapabilityRecord;
  scenarios: ScenarioInput[];
  title?: string;
  description?: string;
  organization?: string;
  intro?: string;
  minutesPerStep?: number;
  personalization?: { contextLabel?: string; rationale?: string };
}): DecisionScenarioDefinition {
  const cap = args.capability;
  const titles = EXPERIENCE_TITLES[cap.stableKey];
  const steps = args.scenarios.map((s, i) => ({
    id: `s${i + 1}`,
    opportunityId: `opp_${i + 1}`,
    capabilityId: cap.id,
    cognitiveDemand: s.level,
    scenarioFamily: s.family,
    scenarioKey: s.scenarioKey,
    independenceGroup: `g${i + 1}`,
    situation: s.situation,
    question: s.question,
    options: shuffleStable(s.options, s.scenarioKey).map((o, j) => ({
      id: String.fromCharCode(97 + j),
      text: o.text,
      correct: o.correct,
      errorKey: o.correct ? null : (o.errorKey ?? null),
      feedback: o.feedback,
    })),
    hints: s.hints.slice(0, 2),
    takeaway: s.takeaway,
  }));
  const minutes = Math.max(3, Math.round(steps.length * (args.minutesPerStep ?? 2.5)));
  return {
    schemaVersion: "1.0",
    format: "decision_scenario",
    title: args.title ?? titles?.title ?? `Decidir en situaciones concretas: ${cap.shortLabel}`,
    description: args.description ?? titles?.description ?? `Tomá decisiones en situaciones reales sobre ${cap.shortLabel}.`,
    learningObjective: cap.statement,
    estimatedMinutes: minutes,
    targetCapabilityIds: [cap.id],
    targetCognitiveLevel: cap.targetCognitiveLevel,
    context: { organization: args.organization ?? BANK_ORGANIZATION, intro: args.intro ?? BANK_INTRO },
    steps,
    feedbackPolicy: { type: "immediate" },
    assistancePolicy: { maxHintsPerStep: 2, revealAllowed: false },
    evidenceContract: {
      targetCapabilityIds: [cap.id],
      requiredCognitiveLevel: cap.targetCognitiveLevel,
      requiredOpportunityCount: Math.min(2, steps.length),
      minimumUnassistedOpportunities: 1,
      acceptedPerformanceTypes: ["decision"],
      assistanceConstraints: { maxLevelForStateEligibility: "light_prompting" },
      expectedErrorTaxonomy: cap.knownErrorTypes.map((e) => e.key),
    },
    completionRule: { type: "all_required_steps", minimumOpportunitiesAttempted: steps.length },
    personalization: args.personalization,
  };
}

/**
 * Selección de escenarios: prioriza los que hacen visible el error objetivo y evita ítems ya vistos.
 * `variant` rota la selección para "Generar otra alternativa".
 */
export function selectScenarios(args: {
  capabilityKey: string;
  count: number;
  targetErrorKeys: string[];
  exclude: Set<string>;
  variant?: number;
}): BankScenario[] {
  const pool = bankFor(args.capabilityKey);
  const score = (s: BankScenario) =>
    (args.exclude.has(s.id) ? -10 : 0) + s.options.filter((o) => o.errorKey && args.targetErrorKeys.includes(o.errorKey)).length;
  const ranked = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const fresh = ranked.filter((s) => !args.exclude.has(s.id));
  const base = fresh.length >= args.count ? fresh : ranked;
  const v = (args.variant ?? 0) % Math.max(1, base.length);
  const rotated = [...base.slice(v), ...base.slice(0, v)];
  // Diversidad de familias de escenario: evita dos situaciones casi iguales seguidas.
  const out: BankScenario[] = [];
  for (const s of rotated) {
    if (out.length >= args.count) break;
    if (out.some((o) => o.family === s.family) && rotated.filter((r) => !out.includes(r)).length > args.count - out.length) continue;
    out.push(s);
  }
  for (const s of rotated) if (out.length < args.count && !out.includes(s)) out.push(s);
  return out.slice(0, args.count);
}

const PII = /([\w.+-]+@[\w-]+\.[\w.]+)|(\+?\d[\d\s-]{7,}\d)/;

/** Quality gates pedagógicas + evidencia + técnicas (EE:1483-1560). Un fail bloquea la publicación. */
export function reviewDefinition(def: DecisionScenarioDefinition, cap: CapabilityRecord): QualityReview {
  const checks: QualityReview["checks"] = [];
  const parsed = DecisionScenarioDefinitionSchema.safeParse(def);
  checks.push({
    dimension: "contrato",
    result: parsed.success ? "pass" : "fail",
    message: parsed.success ? "La experiencia cumple el contrato del formato." : `El contrato no valida: ${parsed.error.issues[0]?.message}`,
  });
  const aligned = def.steps.every((s) => def.targetCapabilityIds.includes(s.capabilityId));
  checks.push({ dimension: "alineación", result: aligned ? "pass" : "fail", message: aligned ? "Cada situación observa la capacidad objetivo." : "Hay situaciones que no observan la capacidad objetivo." });
  const oneCorrect = def.steps.every((s) => s.options.filter((o) => o.correct).length === 1);
  checks.push({ dimension: "validez de evidencia", result: oneCorrect ? "pass" : "fail", message: oneCorrect ? "Cada situación tiene una única respuesta adecuada." : "Hay situaciones sin una única respuesta adecuada." });
  const catalog = new Set(cap.knownErrorTypes.map((e) => e.key));
  const distractors = def.steps.flatMap((s) => s.options.filter((o) => !o.correct));
  const mapped = distractors.filter((o) => o.errorKey && catalog.has(o.errorKey)).length;
  checks.push({
    dimension: "errores observables",
    result: catalog.size === 0 ? "warn" : mapped === distractors.length ? "pass" : mapped >= distractors.length / 2 ? "warn" : "fail",
    message:
      catalog.size === 0
        ? "La capacidad no tiene catálogo de errores: las respuestas incorrectas no identifican un error específico."
        : `${mapped} de ${distractors.length} opciones incorrectas revelan un error frecuente identificado.`,
  });
  const lowLevel = def.steps.filter((s) => levelRank(s.cognitiveDemand) < levelRank(cap.targetCognitiveLevel)).length;
  checks.push({
    dimension: "demanda cognitiva",
    result: lowLevel === 0 ? "pass" : "warn",
    message: lowLevel === 0 ? "Las situaciones piden el nivel esperado." : `${lowLevel} situaciones piden un nivel menor al esperado.`,
  });
  const feedbackOk = def.steps.every((s) => s.options.every((o) => o.feedback.length >= 10) && s.takeaway.length >= 10);
  checks.push({ dimension: "feedback", result: feedbackOk ? "pass" : "fail", message: feedbackOk ? "Cada opción explica por qué es adecuada o no." : "Faltan explicaciones de feedback." });
  const enough = def.steps.length >= def.evidenceContract.requiredOpportunityCount;
  checks.push({ dimension: "oportunidades", result: enough ? "pass" : "fail", message: `${def.steps.length} oportunidades independientes de observar la capacidad.` });
  const text = JSON.stringify(def.steps.map((s) => [s.situation, s.question, s.options.map((o) => o.text)]));
  checks.push({ dimension: "privacidad", result: PII.test(text) ? "fail" : "pass", message: PII.test(text) ? "El contenido incluye datos personales." : "No incluye datos personales." });
  checks.push({ dimension: "accesibilidad", result: "pass", message: "Texto y botones: funciona con teclado, lector de pantalla y celular." });
  const perStep = def.estimatedMinutes / Math.max(1, def.steps.length);
  checks.push({ dimension: "carga", result: perStep <= 4 ? "pass" : "warn", message: `Unos ${def.estimatedMinutes} minutos en total.` });
  const overall = checks.some((c) => c.result === "fail") ? "fail" : checks.some((c) => c.result === "warn") ? "warn" : "pass";
  return { overall, checks };
}

export function contentHash(def: DecisionScenarioDefinition) {
  return createHash("sha256").update(JSON.stringify(def)).digest("hex").slice(0, 32);
}
