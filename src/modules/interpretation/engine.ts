import { levelRank, type AssistanceLevel, type CognitiveLevel, COGNITIVE_LEVELS, type QualityBand, type VisibleState } from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import type {
  CapabilityContext,
  ContradictionResult,
  ErrorPatternResult,
  InterpretationResult,
  InterpretationSignal,
  NextEvidenceNeed,
  OpportunityAssessment,
} from "./types";

/**
 * Interpretation Engine (Interpretation_Engine_v1.0) — reglas deterministas.
 * Mismo input + misma versión ⇒ mismo estado estructural (I:1813).
 * Orden de resolución (I:913-931): filtro → agrupación → assessments → sufficiency → error patterns
 * → contradicciones → maturity → attention → visible → confidence → highest level → next need → rationale.
 */

const BAND_RANK: Record<QualityBand, number> = { INELIGIBLE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
const ASSIST_RANK: Record<AssistanceLevel, number> = {
  none: 0,
  light_prompting: 1,
  scaffolded: 2,
  substantial: 3,
  unknown: 4,
  answer_revealed: 5,
};
const lowAssist = (a: AssistanceLevel) => a === "none" || a === "light_prompting";
const strong = (q: QualityBand) => q === "HIGH" || q === "MEDIUM";
const maxLevel = (a: CognitiveLevel, b: CognitiveLevel) => (levelRank(a) >= levelRank(b) ? a : b);

export function eligibleSignals(signals: InterpretationSignal[]): InterpretationSignal[] {
  return signals.filter(
    (s) =>
      s.valid &&
      s.stateEligible &&
      s.qualityBand !== "INELIGIBLE" &&
      s.mappingConfidence >= ENGINE_PARAMS.mappingConfidenceMin &&
      s.assistanceLevel !== "answer_revealed",
  );
}

/** Agrupa por independence group: varias señales de una misma ocasión cuentan como una oportunidad (I:458-520). */
export function buildAssessments(signals: InterpretationSignal[], cap: CapabilityContext): OpportunityAssessment[] {
  const groups = new Map<string, InterpretationSignal[]>();
  for (const s of signals) {
    const k = s.independenceGroupKey;
    const arr = groups.get(k);
    if (arr) arr.push(s);
    else groups.set(k, [s]);
  }
  const out: OpportunityAssessment[] = [];
  for (const [key, sigs] of groups) {
    const sup = sigs.some((s) => s.polarity === "supports");
    const cha = sigs.some((s) => s.polarity === "challenges");
    const result: OpportunityAssessment["result"] = sup && cha ? "mixed" : sup ? "supports" : cha ? "challenges" : "indeterminate";
    const quality = sigs.reduce<QualityBand>((q, s) => (BAND_RANK[s.qualityBand] > BAND_RANK[q] ? s.qualityBand : q), "LOW");
    const demonstratedLevel = sigs
      .filter((s) => s.polarity === "supports")
      .reduce<CognitiveLevel>((l, s) => maxLevel(l, s.demonstratedLevel), "recognize");
    const taskDemand = sigs.reduce<CognitiveLevel>((l, s) => maxLevel(l, s.taskCognitiveDemand), "recognize");
    const assistanceLevel = sigs.reduce<AssistanceLevel>(
      (a, s) => (ASSIST_RANK[s.assistanceLevel] > ASSIST_RANK[a] ? s.assistanceLevel : a),
      "none",
    );
    const errorKeys = [...new Set(sigs.filter((s) => s.polarity === "challenges" && s.normalizedErrorKey).map((s) => s.normalizedErrorKey!))];
    const occurredAt = new Date(Math.max(...sigs.map((s) => s.occurredAt.getTime())));
    out.push({
      opportunityId: key,
      independenceGroupKey: key,
      sourceArtifactId: sigs[0].sourceArtifactId,
      sourceType: sigs[0].sourceType,
      result,
      quality,
      demonstratedLevel,
      taskDemand,
      assistanceLevel,
      errorKeys,
      signalIds: sigs.map((s) => s.id),
      occurredAt,
      supportsAtTarget: result === "supports" && levelRank(demonstratedLevel) >= levelRank(cap.targetLevel),
      challengesAtTarget: (result === "challenges" || result === "mixed") && levelRank(taskDemand) >= levelRank(cap.targetLevel),
    });
  }
  return out.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.opportunityId.localeCompare(b.opportunityId));
}

/** evidence_sufficiency (I:524-569). */
export function computeSufficiency(assessments: OpportunityAssessment[], cap: CapabilityContext) {
  const interpretable = assessments.filter((a) => a.result !== "indeterminate");
  if (interpretable.length === 0) return { sufficiency: "none" as const, reason: "Todavía no hay oportunidades interpretables." };

  const atTarget = interpretable.filter((a) => a.supportsAtTarget || a.challengesAtTarget);
  const high = interpretable.filter((a) => a.quality === "HIGH").length;
  const medPlus = interpretable.filter((a) => strong(a.quality)).length;
  const hasLowAssist = interpretable.some((a) => lowAssist(a.assistanceLevel) && strong(a.quality));

  const sufficient = interpretable.length >= 2 && (high >= 1 || medPlus >= 2) && atTarget.length >= 1 && hasLowAssist;
  if (!sufficient) {
    let reason = "Hay una sola oportunidad o evidencia débil.";
    if (interpretable.length >= 2 && atTarget.length === 0)
      reason = `Toda la evidencia está por debajo del nivel esperado (${cap.targetLevel}).`;
    else if (interpretable.length >= 2 && !hasLowAssist) reason = "Toda la evidencia ocurrió con mucha ayuda.";
    else if (interpretable.length >= 2 && medPlus < 2 && high === 0) reason = "La evidencia disponible es de baja calidad.";
    return { sufficiency: "limited" as const, reason };
  }
  const strongAtTarget = atTarget.filter((a) => strong(a.quality)).length;
  const contexts = new Set(interpretable.map((a) => a.sourceArtifactId)).size;
  const independentShare = interpretable.filter((a) => lowAssist(a.assistanceLevel)).length / interpretable.length;
  const robust = interpretable.length >= 3 && strongAtTarget >= 2 && contexts >= 2 && independentShare >= 0.5;
  return robust
    ? { sufficiency: "robust" as const, reason: "Varias oportunidades independientes, en distintos contextos." }
    : { sufficiency: "sufficient" as const, reason: "Al menos dos oportunidades independientes con evidencia de calidad." };
}

/** ErrorPattern lifecycle candidate/confirmed/resolved (I:709-794). */
export function computeErrorPatterns(assessments: OpportunityAssessment[]): ErrorPatternResult[] {
  const keys = new Set(assessments.flatMap((a) => a.errorKeys));
  const out: ErrorPatternResult[] = [];
  for (const key of keys) {
    // Solo evidencia HIGH/MEDIUM puede confirmar un patrón (LOW nunca crea review).
    const occurrences = assessments.filter((a) => a.errorKeys.includes(key) && strong(a.quality));
    const allOcc = assessments.filter((a) => a.errorKeys.includes(key));
    if (allOcc.length === 0) continue;
    const base = {
      key,
      opportunityIds: allOcc.map((a) => a.opportunityId),
      signalIds: allOcc.flatMap((a) => a.signalIds),
      firstSeenAt: allOcc[0].occurredAt.toISOString(),
      lastSeenAt: allOcc[allOcc.length - 1].occurredAt.toISOString(),
    };
    if (occurrences.length < ENGINE_PARAMS.errorConfirmMinOpportunities) {
      out.push({ ...base, status: "candidate" });
      continue;
    }
    const sources = new Set(occurrences.map((a) => a.sourceArtifactId));
    const rule: "A" | "B" = sources.size >= 2 ? "A" : "B";
    const last = allOcc[allOcc.length - 1].occurredAt.getTime();
    // Resolver exige apoyo al nivel objetivo: explicar bien no corrige un error de aplicación.
    const later = assessments.filter(
      (a) => a.occurredAt.getTime() > last && a.supportsAtTarget && strong(a.quality) && lowAssist(a.assistanceLevel),
    );
    const resolved =
      later.length >= ENGINE_PARAMS.errorResolveMinLaterSupports && later.some((a) => a.quality === "HIGH");
    out.push({
      ...base,
      status: resolved ? "resolved" : "confirmed",
      rule,
      resolvedAt: resolved ? later[ENGINE_PARAMS.errorResolveMinLaterSupports - 1].occurredAt.toISOString() : undefined,
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** Contradicciones de nivel y de fuente (I:798-868). Se conservan: nunca se "limpia" evidencia. */
export function computeContradictions(assessments: OpportunityAssessment[], cap: CapabilityContext): ContradictionResult[] {
  const out: ContradictionResult[] = [];
  const target = levelRank(cap.targetLevel);
  const belowSupports = assessments.filter((a) => a.result === "supports" && levelRank(a.demonstratedLevel) < target && strong(a.quality));
  const challengesAtTarget = assessments.filter((a) => a.challengesAtTarget && strong(a.quality));
  // Solo es contradicción abierta si la evidencia más reciente a nivel objetivo sigue siendo desafiante.
  const atTargetRecent = assessments.filter((a) => a.supportsAtTarget || a.challengesAtTarget).slice(-2);
  const latestChallenging = atTargetRecent.length > 0 && atTargetRecent.some((a) => a.challengesAtTarget);
  if (belowSupports.length > 0 && challengesAtTarget.length > 0 && latestChallenging) {
    out.push({
      type: "level",
      supportingOpportunityIds: belowSupports.map((a) => a.opportunityId),
      challengingOpportunityIds: challengesAtTarget.map((a) => a.opportunityId),
      interpretation: "Comprensión declarativa aparentemente correcta; dificultad al aplicarla en situaciones concretas.",
      nextEvidenceNeeded: "contradiction_resolution",
    });
  }
  const supportsAtTarget = assessments.filter((a) => a.supportsAtTarget && strong(a.quality));
  const supTypes = new Set(supportsAtTarget.map((a) => a.sourceType));
  const chaTypes = new Set(challengesAtTarget.map((a) => a.sourceType));
  const crossSource = [...supTypes].some((t) => !chaTypes.has(t)) && [...chaTypes].some((t) => !supTypes.has(t));
  if (supportsAtTarget.length > 0 && challengesAtTarget.length > 0 && crossSource && latestChallenging) {
    out.push({
      type: "source",
      supportingOpportunityIds: supportsAtTarget.map((a) => a.opportunityId),
      challengingOpportunityIds: challengesAtTarget.map((a) => a.opportunityId),
      interpretation: "Resultados distintos según el tipo de actividad.",
      nextEvidenceNeeded: "contradiction_resolution",
    });
  }
  return out;
}

function currentWindow(assessments: OpportunityAssessment[], cap: CapabilityContext, now: Date) {
  const target = levelRank(cap.targetLevel);
  const relevant = assessments.filter(
    (a) => a.result !== "indeterminate" && (levelRank(a.taskDemand) >= target || a.supportsAtTarget),
  );
  const cutoff = now.getTime() - ENGINE_PARAMS.recencyDays * 86_400_000;
  const recent = relevant.filter((a) => a.occurredAt.getTime() >= cutoff);
  const pool = recent.length >= ENGINE_PARAMS.solidMinSupportingOpportunities ? recent : relevant;
  return pool.slice(-ENGINE_PARAMS.currentWindowSize);
}

export function highestReliableLevel(assessments: OpportunityAssessment[], unresolved: ErrorPatternResult[]): CognitiveLevel | null {
  const unresolvedOpp = new Set(unresolved.flatMap((p) => p.opportunityIds));
  const blockedLevels = assessments.filter((a) => unresolvedOpp.has(a.opportunityId)).map((a) => levelRank(a.taskDemand));
  for (let i = COGNITIVE_LEVELS.length - 1; i >= 0; i--) {
    const level = COGNITIVE_LEVELS[i];
    if (blockedLevels.some((b) => b <= i)) continue;
    const sup = assessments.filter((a) => a.result === "supports" && levelRank(a.demonstratedLevel) >= i && strong(a.quality));
    if (sup.length >= 2 && sup.some((a) => a.quality === "HIGH") && sup.some((a) => lowAssist(a.assistanceLevel))) return level;
  }
  return null;
}

export function interpretCapability(
  cap: CapabilityContext,
  signals: InterpretationSignal[],
  now: Date = new Date(),
): InterpretationResult {
  const eligible = eligibleSignals(signals);
  const assessments = buildAssessments(eligible, cap);
  const { sufficiency, reason: sufficiencyReason } = computeSufficiency(assessments, cap);
  const patterns = computeErrorPatterns(assessments);
  const unresolved = patterns.filter((p) => p.status === "confirmed");
  const contradictions = computeContradictions(assessments, cap);
  const interpretable = assessments.filter((a) => a.result !== "indeterminate" && strong(a.quality));

  // maturity_state (I:616-653) — "Regla inicial para el MVP".
  const window = currentWindow(assessments, cap, now);
  const supportingWindow = window.filter((a) => a.supportsAtTarget && strong(a.quality));
  const reasons: string[] = [];
  let maturity: InterpretationResult["maturityState"];
  if (sufficiency === "none" || interpretable.length === 0) {
    maturity = "unknown";
    reasons.push(sufficiency === "none" ? "NO_ELIGIBLE_EVIDENCE" : "ONLY_WEAK_OR_ASSISTED_EVIDENCE");
  } else {
    const solid =
      new Set(supportingWindow.map((a) => a.independenceGroupKey)).size >= ENGINE_PARAMS.solidMinSupportingOpportunities &&
      supportingWindow.some((a) => a.quality === "HIGH") &&
      supportingWindow.some((a) => lowAssist(a.assistanceLevel)) &&
      window.filter((a) => a.result === "supports").length > window.length / 2 &&
      unresolved.length === 0;
    maturity = solid ? "solid" : "developing";
    reasons.push(solid ? "SOLID_RULE_MET" : "PARTIAL_EVIDENCE");
    if (!solid && supportingWindow.length === 0) reasons.push("NO_SUPPORT_AT_TARGET_LEVEL");
    if (!solid && supportingWindow.length > 0 && !supportingWindow.some((a) => lowAssist(a.assistanceLevel)))
      reasons.push("ASSISTED_SUPPORT_ONLY");
  }
  const attention = unresolved.length > 0 ? "review" : "none";
  if (attention === "review") reasons.push("CONFIRMED_ERROR_PATTERN");
  if (patterns.some((p) => p.status === "resolved")) reasons.push("ERROR_PATTERN_RESOLVED");
  if (patterns.some((p) => p.status === "candidate")) reasons.push("ISOLATED_DIFFICULTY_PENDING_CONFIRMATION");
  if (contradictions.length > 0) reasons.push("OPEN_CONTRADICTION");

  const visible: VisibleState =
    attention === "review" ? "needs_review" : maturity === "solid" ? "solid" : maturity === "developing" ? "in_development" : "unknown";

  const confidence: InterpretationResult["interpretationConfidence"] =
    sufficiency === "robust" && contradictions.length === 0 && unresolved.length === 0
      ? "high"
      : sufficiency === "sufficient" || sufficiency === "robust"
        ? "medium"
        : "low";

  const highest = highestReliableLevel(assessments, unresolved);
  const nextEvidenceNeed = computeNextNeed({ cap, maturity, sufficiency, unresolved, contradictions, assessments, supportingWindow });

  const supporting = assessments.filter((a) => a.result === "supports");
  const challenging = assessments.filter((a) => a.result === "challenges" || a.result === "mixed");

  return {
    capabilityId: cap.id,
    maturityState: maturity,
    attentionState: attention,
    visibleState: visible,
    evidenceSufficiency: sufficiency,
    interpretationConfidence: confidence,
    highestReliablyDemonstratedLevel: highest,
    supportingOpportunityIds: supporting.map((a) => a.opportunityId),
    challengingOpportunityIds: challenging.map((a) => a.opportunityId),
    errorPatterns: patterns,
    contradictions,
    nextEvidenceNeed,
    rationale: {
      stateReasonCodes: reasons,
      supportingEvidenceIds: supporting.flatMap((a) => a.signalIds),
      challengingEvidenceIds: challenging.flatMap((a) => a.signalIds),
      resolvedErrorPatternKeys: patterns.filter((p) => p.status === "resolved").map((p) => p.key),
      unresolvedErrorPatternKeys: unresolved.map((p) => p.key),
      sufficiencyReason,
    },
    eligibleOpportunityCount: assessments.length,
    engineVersion: ENGINE_PARAMS.interpretationEngineVersion,
  };
}

function computeNextNeed(x: {
  cap: CapabilityContext;
  maturity: InterpretationResult["maturityState"];
  sufficiency: InterpretationResult["evidenceSufficiency"];
  unresolved: ErrorPatternResult[];
  contradictions: ContradictionResult[];
  assessments: OpportunityAssessment[];
  supportingWindow: OpportunityAssessment[];
}): NextEvidenceNeed {
  if (x.unresolved.length > 0) {
    const dominant = [...x.unresolved].sort((a, b) => b.opportunityIds.length - a.opportunityIds.length)[0];
    return { type: "error_retest", errorKey: dominant.key, targetLevel: x.cap.targetLevel, reason: "Comprobar si el error recurrente ya se corrigió." };
  }
  if (x.contradictions.length > 0)
    return { type: "contradiction_resolution", targetLevel: x.cap.targetLevel, reason: "Distinguir entre lo que se explica y lo que se aplica." };
  if (x.maturity === "solid") return { type: "no_additional_evidence_needed", reason: "La capacidad ya tiene evidencia sólida." };
  if (x.sufficiency === "none") return { type: "more_evidence", targetLevel: x.cap.targetLevel, reason: "Todavía no hay evidencia sobre esta capacidad." };
  if (x.supportingWindow.length === 0 && x.assessments.some((a) => a.result === "supports"))
    return { type: "higher_cognitive_level", targetLevel: x.cap.targetLevel, reason: "La evidencia positiva está por debajo del nivel esperado." };
  if (x.supportingWindow.length > 0 && !x.supportingWindow.some((a) => lowAssist(a.assistanceLevel)))
    return { type: "unassisted_attempt", targetLevel: x.cap.targetLevel, reason: "Falta verlo resuelto sin ayuda." };
  if (x.supportingWindow.length === 1)
    return { type: "independent_attempt", targetLevel: x.cap.targetLevel, reason: "Falta una segunda oportunidad independiente." };
  return { type: "more_evidence", targetLevel: x.cap.targetLevel, reason: "La evidencia todavía es parcial." };
}

export const VISIBLE_STATE_LABEL: Record<VisibleState, string> = {
  unknown: "Todavía no sabemos",
  in_development: "En desarrollo",
  solid: "Evidencia sólida",
  needs_review: "Conviene revisar",
};
