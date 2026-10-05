import type {
  AssistanceLevel,
  CognitiveLevel,
  ErrorType,
  Performance,
  Polarity,
  ProvenanceQuality,
  QualityBand,
} from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";

/**
 * Evidence Engine — reglas deterministas (Curriculum_Model_Evidence_Engine §8-§12).
 * Funciones puras: reciben lo que hizo el estudiante y devuelven la clasificación de la señal.
 * Nunca afirman "entiende X": registran qué hizo en una situación concreta.
 */

export function assistanceFromHints(hintsUsed: number, answerRevealed: boolean): AssistanceLevel {
  if (answerRevealed) return "answer_revealed";
  if (hintsUsed <= 0) return "none";
  if (hintsUsed === 1) return "light_prompting";
  return "scaffolded";
}

export type QualityInput = {
  provenance: ProvenanceQuality;
  assistance: AssistanceLevel;
  mappingConfidence: number;
  /** true si la performance surge de interpretación semántica (tutor, importación) y no de una clave de respuesta. */
  semantic: boolean;
  /** Reintento del mismo ítem tras ver feedback: práctica, no oportunidad independiente. */
  sameItemRetry: boolean;
};

export function qualityBand(i: QualityInput): QualityBand {
  if (i.provenance === "self_reported") return "INELIGIBLE";
  if (i.assistance === "answer_revealed") return "INELIGIBLE";
  if (i.sameItemRetry) return "LOW";
  if (i.mappingConfidence < ENGINE_PARAMS.mappingConfidenceMin) return "LOW";
  if (i.assistance === "substantial" || i.assistance === "unknown") return "LOW";

  const lowAssist = i.assistance === "none" || i.assistance === "light_prompting";
  let band: QualityBand;
  if (!i.semantic && i.provenance === "direct") {
    band = lowAssist && i.mappingConfidence >= ENGINE_PARAMS.mappingConfidencePrimary ? "HIGH" : "MEDIUM";
  } else {
    band = lowAssist ? "MEDIUM" : "LOW";
  }
  // Procedencia contribuida (TXT/MD subido) pesa una banda menos que lo observado directamente.
  if (i.provenance === "user_uploaded" && band === "HIGH") band = "MEDIUM";
  return band;
}

export type SignalClassification = {
  performance: Performance;
  polarity: Polarity;
  demonstratedLevel: CognitiveLevel;
  errorType: ErrorType | null;
  normalizedErrorKey: string | null;
  qualityBand: QualityBand;
  stateEligible: boolean;
  rationale: string;
};

/** Decisión en un escenario instrumentado: la clave de respuesta y los errores vienen del opportunity manifest. */
export function classifyDecision(input: {
  correct: boolean;
  errorKey: string | null;
  cognitiveDemand: CognitiveLevel;
  hintsUsed: number;
  answerRevealed: boolean;
  attemptNo: number;
  priorFeedbackReceived: boolean;
  provenance?: ProvenanceQuality;
  optionText: string;
  errorLabel?: string | null;
}): SignalClassification & { assistance: AssistanceLevel } {
  const assistance = assistanceFromHints(input.hintsUsed, input.answerRevealed);
  const sameItemRetry = input.attemptNo > 1 && input.priorFeedbackReceived;
  const band = qualityBand({
    provenance: input.provenance ?? "direct",
    assistance,
    mappingConfidence: 1,
    semantic: false,
    sameItemRetry,
  });
  const performance: Performance = input.correct ? "correct" : "incorrect";
  const polarity: Polarity = input.correct ? "supports" : "challenges";
  const stateEligible = band !== "INELIGIBLE" && !sameItemRetry;

  let rationale: string;
  if (input.correct) {
    rationale = `Eligió la respuesta adecuada: "${input.optionText}".`;
  } else {
    rationale = input.errorLabel
      ? `Eligió "${input.optionText}" — ${input.errorLabel.toLowerCase()}.`
      : `Eligió "${input.optionText}", que no resuelve la situación.`;
  }
  if (assistance === "light_prompting") rationale += " Usó una pista breve.";
  if (assistance === "scaffolded") rationale += " Respondió después de dos pistas.";
  if (assistance === "answer_revealed") rationale += " La respuesta se reveló antes: se usa como práctica.";
  if (sameItemRetry) rationale += " Reintento del mismo ítem después del feedback: cuenta como práctica.";

  return {
    performance,
    polarity,
    demonstratedLevel: input.cognitiveDemand,
    errorType: input.correct ? null : input.errorKey ? "misconception" : "application_failure",
    normalizedErrorKey: input.correct ? null : input.errorKey,
    qualityBand: band,
    stateEligible,
    rationale,
    assistance,
  };
}

/** Explicación o respuesta abierta evaluada semánticamente (tutor o conversación importada). */
export function classifySemantic(input: {
  performance: Performance;
  errorKey: string | null;
  demonstratedLevel: CognitiveLevel;
  mappingConfidence: number;
  assistance: AssistanceLevel;
  provenance: ProvenanceQuality;
  rationale: string;
}): SignalClassification {
  const band = qualityBand({
    provenance: input.provenance,
    assistance: input.assistance,
    mappingConfidence: input.mappingConfidence,
    semantic: true,
    sameItemRetry: false,
  });
  const polarity: Polarity =
    input.performance === "correct"
      ? "supports"
      : input.performance === "incorrect"
        ? "challenges"
        : input.performance === "partially_correct"
          ? "neutral"
          : "neutral";
  const stateEligible =
    band !== "INELIGIBLE" && polarity !== "neutral" && input.mappingConfidence >= ENGINE_PARAMS.mappingConfidenceMin;
  return {
    performance: input.performance,
    polarity,
    demonstratedLevel: input.demonstratedLevel,
    errorType: polarity === "challenges" ? (input.errorKey ? "misconception" : "incomplete_reasoning") : null,
    normalizedErrorKey: polarity === "challenges" ? input.errorKey : null,
    qualityBand: band,
    stateEligible,
    rationale: input.rationale,
  };
}

export const ASSISTANCE_LABEL: Record<AssistanceLevel, string> = {
  none: "Sin ayuda",
  light_prompting: "Con una pista breve",
  scaffolded: "Con ayuda guiada",
  substantial: "Con mucha ayuda",
  answer_revealed: "Con la respuesta revelada",
  unknown: "Ayuda desconocida",
};
