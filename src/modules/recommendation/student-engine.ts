import { createHash } from "node:crypto";
import type { KnownErrorType } from "@/db/schema/curriculum";
import type { CognitiveLevel, EvidenceSufficiency, Importance, VisibleState } from "@/modules/shared/enums";
import { levelRank } from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import type { ContradictionResult, NextEvidenceNeed } from "@/modules/interpretation/types";
import type { ActionFormat, StudentRecommendationCandidate, StudentReasonCode } from "./types";

/**
 * Section Recommendation Engine (Recommendation_Engine_v1.0 §R:661-944).
 * Política jerárquica, sin score opaco:
 * A docente requerido → B retomar → C urgencia de evaluación → D review → E next_evidence_need → F avanzar → G transferir.
 */

export type ScheduleStatus = "not_introduced" | "introduced" | "active" | "completed_in_schedule";

export type CapabilityMeta = {
  id: string;
  shortLabel: string;
  statement: string;
  targetLevel: CognitiveLevel;
  importance: Importance;
  sortOrder: number;
  scheduleStatus: ScheduleStatus;
  prerequisiteIds: string[];
  knownErrorTypes: KnownErrorType[];
  hasScenarioBank: boolean;
};

export type InterpretationLite = {
  capabilityId: string;
  visibleState: VisibleState;
  evidenceSufficiency: EvidenceSufficiency;
  nextEvidenceNeed: NextEvidenceNeed;
  unresolvedErrorKeys: string[];
  contradictions: ContradictionResult[];
  eligibleOpportunityCount: number;
  interpretationId: string;
};

/** Resumen estructurado de evidencia por capacidad para armar el "¿Por qué?" sin texto libre del LLM. */
export type EvidenceDigest = {
  capabilityId: string;
  supportsBelowTarget: number;
  supportsAtTarget: number;
  challengesByError: { errorKey: string | null; count: number }[];
  lastSupportSourceLabel?: string;
  lastChallengeSourceLabel?: string;
};

export type SectionRecContext = {
  courseSectionId: string;
  subjectName: string;
  capabilities: CapabilityMeta[];
  interpretations: Record<string, InterpretationLite>;
  digests: Record<string, EvidenceDigest>;
  openLaunches: { launchId: string; title: string; capabilityIds: string[]; estimatedMinutes: number; completed: boolean }[];
  resumable: { sessionId: string; title: string; capabilityId: string | null; lastActivityAt: Date; answered: number; total: number }[];
  nextAssessment: { id: string; title: string; dueAt: Date } | null;
  /** Formatos de las últimas recomendaciones completadas por capacidad (más reciente primero). */
  recentFormats: Record<string, ActionFormat[]>;
  disagreedContextHashes: string[];
  now: Date;
};

const IMPORTANCE_RANK: Record<Importance, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const hash = (parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
const daysBetween = (a: Date, b: Date) => Math.ceil((b.getTime() - a.getTime()) / 86_400_000);

const isIntroduced = (c: CapabilityMeta) => c.scheduleStatus !== "not_introduced";

function errorLabel(cap: CapabilityMeta, key: string | null | undefined) {
  const e = cap.knownErrorTypes.find((x) => x.key === key);
  return e ? (e.studentLabel ?? e.label) : null;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

function preferredFormat(cap: CapabilityMeta, ctx: SectionRecContext): ActionFormat {
  const recent = ctx.recentFormats[cap.id] ?? [];
  const max = ENGINE_PARAMS.maxConsecutiveSameFormat;
  if (cap.hasScenarioBank) {
    // Cooldown: no más de N veces seguidas el mismo formato (R:1015-1036).
    const streak = recent.slice(0, max).filter((f) => f === "decision_scenario").length;
    return streak >= max ? "ai_tutor" : "decision_scenario";
  }
  return "ai_tutor";
}

function prerequisiteCentrality(cap: CapabilityMeta, ctx: SectionRecContext) {
  return ctx.capabilities.filter((c) => c.prerequisiteIds.includes(cap.id)).length;
}

export function generateSectionCandidates(ctx: SectionRecContext): StudentRecommendationCandidate[] {
  const out: StudentRecommendationCandidate[] = [];
  const capById = new Map(ctx.capabilities.map((c) => [c.id, c]));
  const assessmentDays = ctx.nextAssessment ? daysBetween(ctx.now, ctx.nextAssessment.dueAt) : null;
  const assessmentNear = assessmentDays !== null && assessmentDays >= 0 && assessmentDays <= ENGINE_PARAMS.assessmentNearDays;

  // A — actividad requerida por el docente (lanzamiento abierto, misma cátedra, no completada).
  for (const l of ctx.openLaunches.filter((l) => !l.completed)) {
    const cap = l.capabilityIds.map((id) => capById.get(id)).find(Boolean);
    out.push({
      courseSectionId: ctx.courseSectionId,
      mode: "practice",
      domain: "academic_learning",
      priorityClass: "teacher_required",
      priorityBand: "urgent",
      title: l.title,
      objective: cap ? cap.statement : l.title,
      capabilityIds: l.capabilityIds,
      reasonCodes: ["TEACHER_REQUIRED"],
      actionSpec: {
        actionType: "complete_teacher_action",
        format: "decision_scenario",
        capabilityId: cap?.id ?? null,
        targetCognitiveLevel: cap?.targetLevel ?? null,
        estimatedMinutes: l.estimatedMinutes,
        launchId: l.launchId,
        ctaLabel: "Empezar",
        href: `/estudiante/lanzamientos/${l.launchId}`,
      },
      explanation: {
        short: "Tu docente abrió esta actividad para la clase.",
        observed: [],
        missing: [],
        whyThis: "Las actividades que lanza tu docente tienen prioridad mientras están abiertas.",
        expectedOutcome: "Tus respuestas se suman, de forma anónima, a lo que tu docente ve del aula.",
      },
      sources: [{ sourceType: "teacher_action", sourceId: l.launchId, reasonCode: "TEACHER_REQUIRED" }],
      contextHash: hash(["teacher_required", l.launchId]),
    });
  }

  // B — retomar sesión reciente relevante (resume_window = 72 h).
  for (const s of ctx.resumable) {
    const ageH = (ctx.now.getTime() - s.lastActivityAt.getTime()) / 3_600_000;
    if (ageH > ENGINE_PARAMS.resumeWindowHours) continue;
    out.push({
      courseSectionId: ctx.courseSectionId,
      mode: "resume",
      domain: "continuity",
      priorityClass: "resume",
      priorityBand: "high",
      title: `Continuá: ${s.title}`,
      objective: s.title,
      capabilityIds: s.capabilityId ? [s.capabilityId] : [],
      reasonCodes: ["RESUME_RECENT_SESSION"],
      actionSpec: {
        actionType: "resume_session",
        format: "session_resume",
        capabilityId: s.capabilityId,
        targetCognitiveLevel: null,
        estimatedMinutes: Math.max(3, (s.total - s.answered) * 2),
        sessionId: s.sessionId,
        ctaLabel: "Continuar",
        href: `/estudiante/experiencias/${s.sessionId}`,
      },
      explanation: {
        short: `Te quedaron ${s.total - s.answered} de ${s.total} situaciones.`,
        observed: [],
        missing: [],
        whyThis: "Retomar donde quedaste evita empezar de cero.",
        expectedOutcome: "Al terminar, actualizamos cómo venís en esta capacidad.",
      },
      sources: [{ sourceType: "session", sourceId: s.sessionId, reasonCode: "RESUME_RECENT_SESSION" }],
      contextHash: hash(["resume", s.sessionId]),
    });
  }

  // C/D — capacidades en revisión (urgencia si hay evaluación cercana).
  const reviewCaps = ctx.capabilities
    .filter((c) => ctx.interpretations[c.id]?.visibleState === "needs_review")
    .sort(
      (a, b) =>
        IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance] ||
        prerequisiteCentrality(b, ctx) - prerequisiteCentrality(a, ctx) ||
        a.sortOrder - b.sortOrder,
    );
  for (const cap of reviewCaps) {
    const it = ctx.interpretations[cap.id];
    const dg = ctx.digests[cap.id];
    const format = preferredFormat(cap, ctx);
    const errKey = it.nextEvidenceNeed.errorKey ?? it.unresolvedErrorKeys[0] ?? null;
    const errLbl = errorLabel(cap, errKey);
    const hasLevelContradiction = it.contradictions.some((c) => c.type === "level");
    const reasonCodes: StudentReasonCode[] = ["CONFIRMED_ERROR_PATTERN"];
    if (hasLevelContradiction) reasonCodes.push("CONTRADICTION_NEEDS_RESOLUTION");
    if (assessmentNear) reasonCodes.push("ASSESSMENT_NEAR");
    if (prerequisiteCentrality(cap, ctx) > 0) reasonCodes.push("PREREQUISITE_RISK");

    const errCount = dg?.challengesByError.find((e) => e.errorKey === errKey)?.count ?? 0;
    const observed: string[] = [];
    if (hasLevelContradiction && dg && dg.supportsBelowTarget > 0)
      observed.push(`Explicaste bien los conceptos${dg.lastSupportSourceLabel ? ` (${dg.lastSupportSourceLabel})` : ""}.`);
    if (errLbl && errCount > 0)
      observed.push(`En ${errCount} ${plural(errCount, "situación", "situaciones")} apareció el mismo error: ${errLbl.charAt(0).toLowerCase()}${errLbl.slice(1)}.`);
    if (dg && dg.supportsAtTarget > 0)
      observed.push(`En ${dg.supportsAtTarget} ${plural(dg.supportsAtTarget, "situación", "situaciones")} lo resolviste bien.`);

    const whyThis =
      format === "decision_scenario"
        ? hasLevelContradiction
          ? "La dificultad aparece al decidir, no al definir. Por eso te proponemos situaciones concretas en lugar de repasar definiciones."
          : "Decidir en situaciones concretas es la forma más directa de corregir esta confusión."
        : "Ya practicaste con situaciones; ahora conviene ver el contraste con otra explicación y probarlo por tu cuenta.";

    out.push({
      courseSectionId: ctx.courseSectionId,
      mode: "remediate",
      domain: assessmentNear ? "assessment_preparation" : "academic_learning",
      priorityClass: assessmentNear ? "urgent" : "review",
      priorityBand: assessmentNear ? "urgent" : "high",
      title: `Aclará ${cap.shortLabel}`,
      objective: cap.statement,
      capabilityIds: [cap.id],
      reasonCodes,
      actionSpec: {
        actionType: format === "decision_scenario" ? "error_focused_practice" : "contrastive_example",
        format,
        capabilityId: cap.id,
        targetCognitiveLevel: cap.targetLevel,
        estimatedMinutes: format === "decision_scenario" ? 10 : 8,
        targetErrorKey: errKey,
        ctaLabel: "Empezar",
        href: "",
      },
      explanation: {
        short: hasLevelContradiction
          ? "Explicás bien los conceptos, pero al aplicarlos aparece una confusión."
          : "Apareció la misma dificultad en más de una situación.",
        observed,
        missing: ["Todavía no te vimos resolver situaciones nuevas sin ese error."],
        whyThis,
        expectedOutcome: "Si lo resolvés bien en situaciones nuevas, esta capacidad puede salir de “Conviene revisar”.",
        uncertainty: assessmentNear && ctx.nextAssessment ? `${ctx.nextAssessment.title} en ${assessmentDays} días.` : undefined,
      },
      sources: [{ sourceType: "interpretation", sourceId: it.interpretationId, reasonCode: "CONFIRMED_ERROR_PATTERN" }],
      contextHash: hash(["review", cap.id, format, errKey, it.eligibleOpportunityCount]),
    });
  }

  // E — necesidad de evidencia en capacidades introducidas (unknown / in_development).
  const evidenceCaps = ctx.capabilities
    .filter((c) => isIntroduced(c))
    .filter((c) => {
      const s = ctx.interpretations[c.id]?.visibleState ?? "unknown";
      return s === "in_development" || s === "unknown";
    })
    .sort((a, b) => {
      // Primero lo que el cronograma ya trabajó y está en desarrollo; después lo desconocido.
      const sa = ctx.interpretations[a.id]?.visibleState === "in_development" ? 0 : 1;
      const sb = ctx.interpretations[b.id]?.visibleState === "in_development" ? 0 : 1;
      return sa - sb || IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance] || a.sortOrder - b.sortOrder;
    });
  for (const cap of evidenceCaps) {
    const it = ctx.interpretations[cap.id];
    const state = it?.visibleState ?? "unknown";
    const need = it?.nextEvidenceNeed ?? { type: "more_evidence" as const, reason: "" };
    const prereqRisk = cap.prerequisiteIds.some((p) => ctx.interpretations[p]?.visibleState === "needs_review");
    if (prereqRisk) continue; // Primero el prerrequisito crítico (R:851-872).
    const format: ActionFormat = cap.hasScenarioBank && levelRank(cap.targetLevel) >= levelRank("apply") ? "decision_scenario" : "ai_tutor";
    const dg = ctx.digests[cap.id];
    let title: string;
    let code: StudentReasonCode;
    let short: string;
    let actionType: StudentRecommendationCandidate["actionSpec"]["actionType"];
    if (state === "unknown") {
      title = format === "decision_scenario" ? `Probalo en situaciones: ${cap.shortLabel}` : `Explicá con tus palabras: ${cap.shortLabel}`;
      code = "INSUFFICIENT_EVIDENCE";
      short = "Todavía no tenemos evidencia sobre esta capacidad.";
      actionType = "diagnostic_probe";
    } else if (need.type === "unassisted_attempt") {
      title = `Probalo sin ayuda: ${cap.shortLabel}`;
      code = "UNASSISTED_EVIDENCE_NEEDED";
      short = "Lo resolviste, pero con ayuda. Falta verlo por tu cuenta.";
      actionType = "independent_attempt";
    } else if (need.type === "higher_cognitive_level") {
      title = `Aplicá ${cap.shortLabel} a un caso`;
      code = "HIGHER_COGNITIVE_LEVEL_NEEDED";
      short = "Ya lo explicás; falta verte aplicarlo.";
      actionType = "application_challenge";
    } else {
      title = `Confirmá en otra situación: ${cap.shortLabel}`;
      code = "INSUFFICIENT_EVIDENCE";
      short = "Vas bien, pero la evidencia todavía es parcial.";
      actionType = "independent_attempt";
    }
    const observed: string[] = [];
    if (dg?.supportsAtTarget) observed.push(`Lo resolviste bien en ${dg.supportsAtTarget} ${plural(dg.supportsAtTarget, "situación", "situaciones")}.`);
    if (dg?.supportsBelowTarget) observed.push("Explicaste el concepto con tus palabras.");
    out.push({
      courseSectionId: ctx.courseSectionId,
      mode: state === "unknown" ? "verify" : "practice",
      domain: "academic_learning",
      priorityClass: "evidence_need",
      priorityBand: "normal",
      title,
      objective: cap.statement,
      capabilityIds: [cap.id],
      reasonCodes: [code],
      actionSpec: {
        actionType,
        format,
        capabilityId: cap.id,
        targetCognitiveLevel: cap.targetLevel,
        estimatedMinutes: format === "decision_scenario" ? 8 : 8,
        ctaLabel: "Empezar",
        href: "",
      },
      explanation: {
        short,
        observed,
        missing: [need.reason || "Necesitamos una oportunidad más para saber cómo venís."],
        whyThis: "Una actividad corta alcanza para saber cómo venís y elegir mejor el próximo paso.",
        expectedOutcome: "Con esta evidencia podemos decirte si la capacidad ya es sólida o qué conviene revisar.",
      },
      sources: it ? [{ sourceType: "interpretation", sourceId: it.interpretationId, reasonCode: code }] : [{ sourceType: "curriculum", sourceId: cap.id, reasonCode: code }],
      contextHash: hash(["evidence", cap.id, format, state, need.type, it?.eligibleOpportunityCount ?? 0]),
    });
  }

  // G — transferir capacidades sólidas antes que repetir (sin desplazar contenido nuevo obligatorio).
  const solidCaps = ctx.capabilities
    .filter((c) => isIntroduced(c) && ctx.interpretations[c.id]?.visibleState === "solid" && c.targetLevel !== "transfer")
    .sort((a, b) => IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance] || b.sortOrder - a.sortOrder);
  for (const cap of solidCaps.slice(0, 1)) {
    const it = ctx.interpretations[cap.id];
    out.push({
      courseSectionId: ctx.courseSectionId,
      mode: "transfer",
      domain: "academic_learning",
      priorityClass: "transfer",
      priorityBand: "low",
      title: `Llevá ${cap.shortLabel} a un caso nuevo`,
      objective: cap.statement,
      capabilityIds: [cap.id],
      reasonCodes: ["TRANSFER_NEEDED"],
      actionSpec: {
        actionType: "transfer_challenge",
        format: "ai_tutor",
        capabilityId: cap.id,
        targetCognitiveLevel: "transfer",
        estimatedMinutes: 10,
        ctaLabel: "Empezar",
        href: "",
      },
      explanation: {
        short: "Ya tenés evidencia sólida. El paso siguiente es usarlo en otro contexto.",
        observed: ["Resolviste bien varias situaciones de forma independiente."],
        missing: ["Todavía no lo aplicaste en un contexto distinto al de la materia."],
        whyThis: "Transferir a un caso nuevo consolida más que repetir lo que ya sabés hacer.",
        expectedOutcome: "Si lo transferís bien, avanzás hacia el último tramo del recorrido.",
      },
      sources: [{ sourceType: "interpretation", sourceId: it.interpretationId, reasonCode: "TRANSFER_NEEDED" }],
      contextHash: hash(["transfer", cap.id, it.eligibleOpportunityCount]),
    });
  }

  // F — avanzar al siguiente objetivo curricular (introducido y sin estado todavía): cubierto por E con diagnostic_probe.

  const ORDER: Record<StudentRecommendationCandidate["priorityClass"], number> = {
    teacher_required: 0,
    resume: 1,
    urgent: 2,
    review: 3,
    evidence_need: 4,
    advance: 5,
    transfer: 6,
  };
  const disagreed = new Set(ctx.disagreedContextHashes);
  return out
    .filter((c) => !disagreed.has(c.contextHash))
    .sort((a, b) => ORDER[a.priorityClass] - ORDER[b.priorityClass]);
}

/** Global Student Orchestrator (R:896-944): compara solo metadata entre cátedras, nunca evidencia. */
export type OrchestratorItem = {
  recommendationId: string;
  courseSectionId: string;
  priorityClass: string;
  dueAt: Date | null;
  importanceHint: number;
  estimatedMinutes: number;
  sectionOrder: number;
  rank: number;
};

const GLOBAL_ORDER: Record<string, number> = {
  teacher_required: 0,
  urgent: 1,
  resume: 2,
  review: 3,
  evidence_need: 4,
  advance: 5,
  transfer: 6,
};

export function orchestrate(items: OrchestratorItem[]): OrchestratorItem[] {
  return [...items].sort(
    (a, b) =>
      (GLOBAL_ORDER[a.priorityClass] ?? 9) - (GLOBAL_ORDER[b.priorityClass] ?? 9) ||
      (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
      a.rank - b.rank ||
      b.importanceHint - a.importanceHint ||
      a.estimatedMinutes - b.estimatedMinutes ||
      a.sectionOrder - b.sectionOrder,
  );
}
