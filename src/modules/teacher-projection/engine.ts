import type { KnownErrorType } from "@/db/schema/curriculum";
import type { CognitiveLevel, EvidenceSufficiency, Importance, VisibleState } from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import type { ScheduleStatus } from "@/modules/recommendation/student-engine";

/**
 * Proyección docente y Teacher Recommendation (Interpretation I:1162-1236, Recommendation R:1283-1568).
 * Recibe estados individuales SOLO dentro de este módulo y devuelve conteos sin identidad.
 * Denominador = estudiantes con evidencia suficiente (sufficient|robust), nunca todos los inscriptos.
 */

export type InterpretationRowForAggregation = {
  capabilityId: string;
  visibleState: VisibleState;
  evidenceSufficiency: EvidenceSufficiency;
  unresolvedErrorKeys: string[];
  hasLevelContradiction: boolean;
};

export type CapabilityAggregate = {
  capabilityId: string;
  enrolledCount: number;
  evidenceSufficientCount: number;
  withAnyEvidenceCount: number;
  unknownCount: number;
  developingCount: number;
  solidCount: number;
  needsReviewCount: number;
  needsReviewRate: number | null;
  evidenceCoverage: number;
  confirmedErrorPatterns: { key: string; count: number }[];
  cognitiveGapCount: number;
  contradictionCount: number;
};

export function aggregateCapability(
  capabilityId: string,
  enrolledCount: number,
  rows: InterpretationRowForAggregation[],
): CapabilityAggregate {
  const r = rows.filter((x) => x.capabilityId === capabilityId);
  const sufficient = r.filter((x) => x.evidenceSufficiency === "sufficient" || x.evidenceSufficiency === "robust");
  const reviewAmongSufficient = sufficient.filter((x) => x.visibleState === "needs_review");
  const anyEvidence = r.filter((x) => x.evidenceSufficiency !== "none");
  const errorCounts = new Map<string, number>();
  for (const x of r.filter((x) => x.visibleState === "needs_review"))
    for (const k of x.unresolvedErrorKeys) errorCounts.set(k, (errorCounts.get(k) ?? 0) + 1);
  const count = (s: VisibleState) => r.filter((x) => x.visibleState === s).length;
  return {
    capabilityId,
    enrolledCount,
    evidenceSufficientCount: sufficient.length,
    withAnyEvidenceCount: anyEvidence.length,
    unknownCount: enrolledCount - r.length + count("unknown"),
    developingCount: count("in_development"),
    solidCount: count("solid"),
    needsReviewCount: reviewAmongSufficient.length,
    needsReviewRate: sufficient.length > 0 ? reviewAmongSufficient.length / sufficient.length : null,
    evidenceCoverage: enrolledCount > 0 ? sufficient.length / enrolledCount : 0,
    confirmedErrorPatterns: [...errorCounts.entries()].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count),
    cognitiveGapCount: r.filter((x) => x.visibleState === "needs_review" && x.hasLevelContradiction).length,
    contradictionCount: r.filter((x) => x.hasLevelContradiction).length,
  };
}

/** Small-cell suppression (DM:1210-1224): nunca devolver un desglose con n < 5. */
export function suppress<T>(n: number, value: T): T | null {
  return n >= ENGINE_PARAMS.minAggregateCellSize ? value : null;
}

export type FindingInput = {
  capabilityId: string;
  shortLabel: string;
  statement: string;
  targetLevel: CognitiveLevel;
  importance: Importance;
  scheduleStatus: ScheduleStatus;
  /** Etiquetas de capacidades que dependen de esta (centralidad como prerrequisito). */
  prerequisiteOf: string[];
  knownErrorTypes: KnownErrorType[];
  aggregate: CapabilityAggregate;
  /** Tasa de revisión del snapshot anterior comparable, si existe. */
  previousRate: number | null;
};

export type FindingDraft = {
  capabilityId: string;
  findingType: "needs_review" | "low_coverage";
  headline: string;
  detail: string;
  basis: string;
  reasonCodes: string[];
  rate: number | null;
  numerator: number;
  denominator: number;
  enrolled: number;
  dominantErrorKey: string | null;
  dominantErrorLabel: string | null;
  cognitiveGapCount: number;
  score: number;
};

const IMPORTANCE_WEIGHT: Record<Importance, number> = { low: 0, medium: 0.05, high: 0.1, critical: 0.15 };

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function computeFindings(inputs: FindingInput[], opts: { assessmentInDays: number | null }): FindingDraft[] {
  const P = ENGINE_PARAMS;
  const out: FindingDraft[] = [];
  const assessmentSoon =
    opts.assessmentInDays !== null && opts.assessmentInDays >= 0 && opts.assessmentInDays <= P.teacherAssessmentHorizonDays;

  for (const f of inputs) {
    if (f.scheduleStatus === "not_introduced") continue;
    const a = f.aggregate;
    const enoughGroup = a.evidenceSufficientCount >= P.minAggregateCellSize;
    const rate = a.needsReviewRate;

    if (enoughGroup && rate !== null && rate >= P.minReviewRateForFinding && a.needsReviewCount > 0) {
      const dom = a.confirmedErrorPatterns[0];
      const domLabel = dom ? (f.knownErrorTypes.find((e) => e.key === dom.key)?.label ?? null) : null;
      const reasonCodes = ["CLASS_CONFIRMED_ERROR_PATTERN"];
      const gapShare = a.needsReviewCount > 0 ? a.cognitiveGapCount / a.needsReviewCount : 0;
      if (gapShare >= 0.5) reasonCodes.push("CLASS_COGNITIVE_GAP");
      if (f.prerequisiteOf.length > 0) reasonCodes.push("CLASS_PREREQUISITE_RISK");
      if (assessmentSoon) reasonCodes.push("CLASS_ASSESSMENT_NEAR");
      if (f.previousRate !== null && rate - f.previousRate >= 0.05) reasonCodes.push("CLASS_NEGATIVE_TREND");
      const score =
        rate +
        IMPORTANCE_WEIGHT[f.importance] +
        0.05 * Math.min(f.prerequisiteOf.length, 3) +
        (assessmentSoon ? 0.1 : 0) +
        (reasonCodes.includes("CLASS_COGNITIVE_GAP") ? 0.05 : 0);
      out.push({
        capabilityId: f.capabilityId,
        findingType: "needs_review",
        headline: `${pct(rate)} necesita revisar ${f.shortLabel}`,
        detail: domLabel && dom && dom.count >= P.minAggregateCellSize ? `Principal dificultad: ${domLabel.charAt(0).toLowerCase()}${domLabel.slice(1)}.` : "La dificultad se repite en más de una situación.",
        basis: `Basado en ${a.evidenceSufficientCount} estudiantes con evidencia suficiente (de ${a.enrolledCount} inscriptos).`,
        reasonCodes,
        rate,
        numerator: a.needsReviewCount,
        denominator: a.evidenceSufficientCount,
        enrolled: a.enrolledCount,
        dominantErrorKey: dom && dom.count >= P.minAggregateCellSize ? dom.key : null,
        dominantErrorLabel: dom && dom.count >= P.minAggregateCellSize ? domLabel : null,
        cognitiveGapCount: a.cognitiveGapCount,
        score,
      });
      continue;
    }

    if (a.evidenceCoverage < P.lowCoverageThreshold && f.scheduleStatus !== "completed_in_schedule") {
      out.push({
        capabilityId: f.capabilityId,
        findingType: "low_coverage",
        headline: `Necesitamos observar mejor ${f.shortLabel} antes de concluir`,
        detail: `Solo ${a.evidenceSufficientCount} de ${a.enrolledCount} estudiantes tienen evidencia suficiente sobre esta capacidad.`,
        basis: "Con tan poca cobertura, un porcentaje no sería representativo.",
        reasonCodes: ["CLASS_LOW_EVIDENCE_COVERAGE"],
        rate: null,
        numerator: a.evidenceSufficientCount,
        denominator: a.enrolledCount,
        enrolled: a.enrolledCount,
        dominantErrorKey: null,
        dominantErrorLabel: null,
        cognitiveGapCount: 0,
        score: 0.12 + IMPORTANCE_WEIGHT[f.importance] + (f.scheduleStatus === "active" ? 0.05 : 0),
      });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, P.maxTeacherFindings);
}

export type InterventionDraft = {
  strategy: "decision_scenario" | "diagnostic_probe";
  title: string;
  minutes: number;
  why: string;
  inClass: string;
};

/** Estrategia docente principal para un hallazgo (R:1283-1568). */
export function recommendIntervention(
  finding: FindingDraft,
  input: FindingInput,
  opts: { experienceTitle?: string | null } = {},
): InterventionDraft {
  if (finding.findingType === "low_coverage") {
    return {
      strategy: "diagnostic_probe",
      title: `Experiencia breve para observar ${input.shortLabel}`,
      minutes: 8,
      why: "Antes de decidir una intervención conviene saber cómo está el aula. Una actividad corta e individual genera esa evidencia.",
      inClass: "Al cierre de la clase, 8 minutos desde el celular.",
    };
  }
  const gap = finding.reasonCodes.includes("CLASS_COGNITIVE_GAP");
  return {
    strategy: "decision_scenario",
    title: opts.experienceTitle ?? `Decidir en situaciones concretas: ${input.shortLabel}`,
    minutes: 15,
    why: gap
      ? "La mayoría ya explica cada rol por separado; la dificultad aparece al decidir en situaciones concretas. Conviene menos teoría y más decisiones."
      : "La misma confusión se repite en distintas situaciones. Decidir en casos concretos con feedback inmediato ataca el error de forma directa.",
    inClass: "Individual desde el celular, después puesta en común de 5 minutos sobre la situación con más dispersión.",
  };
}
