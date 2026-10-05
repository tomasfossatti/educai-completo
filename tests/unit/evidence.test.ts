import { describe, expect, it } from "vitest";
import { assistanceFromHints, classifyDecision, classifySemantic, qualityBand } from "@/modules/evidence/engine";

describe("Evidence Engine — clasificación", () => {
  it("pistas → nivel de asistencia", () => {
    expect(assistanceFromHints(0, false)).toBe("none");
    expect(assistanceFromHints(1, false)).toBe("light_prompting");
    expect(assistanceFromHints(2, false)).toBe("scaffolded");
    expect(assistanceFromHints(0, true)).toBe("answer_revealed");
  });

  it("decisión correcta sin ayuda en experiencia instrumentada → HIGH, elegible", () => {
    const c = classifyDecision({
      correct: true, errorKey: null, cognitiveDemand: "apply", hintsUsed: 0, answerRevealed: false,
      attemptNo: 1, priorFeedbackReceived: false, optionText: "El Product Owner",
    });
    expect(c).toMatchObject({ qualityBand: "HIGH", stateEligible: true, polarity: "supports", assistance: "none" });
  });

  it("decisión incorrecta registra el error del manifest", () => {
    const c = classifyDecision({
      correct: false, errorKey: "sm_prioritizes_backlog", cognitiveDemand: "apply", hintsUsed: 0, answerRevealed: false,
      attemptNo: 1, priorFeedbackReceived: false, optionText: "El Scrum Master", errorLabel: "Le asigna al SM la priorización",
    });
    expect(c).toMatchObject({ polarity: "challenges", normalizedErrorKey: "sm_prioritizes_backlog", errorType: "misconception" });
  });

  it("reintento del mismo ítem tras feedback es práctica, no evidencia de estado", () => {
    const c = classifyDecision({
      correct: true, errorKey: null, cognitiveDemand: "apply", hintsUsed: 0, answerRevealed: false,
      attemptNo: 2, priorFeedbackReceived: true, optionText: "x",
    });
    expect(c.stateEligible).toBe(false);
  });

  it("respuesta revelada es INELIGIBLE", () => {
    expect(qualityBand({ provenance: "direct", assistance: "answer_revealed", mappingConfidence: 1, semantic: false, sameItemRetry: false })).toBe("INELIGIBLE");
  });

  it("autodeclaración nunca es evidencia", () => {
    expect(qualityBand({ provenance: "self_reported", assistance: "none", mappingConfidence: 1, semantic: true, sameItemRetry: false })).toBe("INELIGIBLE");
  });

  it("conversación importada pesa menos que lo observado", () => {
    const s = classifySemantic({
      performance: "correct", errorKey: null, demonstratedLevel: "explain", mappingConfidence: 0.9,
      assistance: "none", provenance: "user_uploaded", rationale: "x",
    });
    expect(s.qualityBand).toBe("MEDIUM");
    const assisted = classifySemantic({
      performance: "correct", errorKey: null, demonstratedLevel: "explain", mappingConfidence: 0.9,
      assistance: "scaffolded", provenance: "user_uploaded", rationale: "x",
    });
    expect(assisted.qualityBand).toBe("LOW");
  });

  it("mapping incierto no cambia estado", () => {
    const s = classifySemantic({
      performance: "correct", errorKey: null, demonstratedLevel: "explain", mappingConfidence: 0.4,
      assistance: "none", provenance: "direct", rationale: "x",
    });
    expect(s.stateEligible).toBe(false);
  });
});
