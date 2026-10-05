import { describe, expect, it } from "vitest";
import { interpretCapability } from "@/modules/interpretation/engine";
import type { InterpretationSignal } from "@/modules/interpretation/types";
import type { AssistanceLevel, CognitiveLevel, QualityBand } from "@/modules/shared/enums";

/** Golden cases de EDU-0510 + ejemplos de Interpretation_Engine_v1.0. */

const CAP = { id: "cap-po-sm", targetLevel: "apply" as CognitiveLevel };
let n = 0;
const day = (d: number) => new Date(Date.UTC(2026, 8, 1 + d, 12));

function sig(p: {
  correct: boolean;
  day: number;
  group?: string;
  source?: string;
  level?: CognitiveLevel;
  band?: QualityBand;
  assistance?: AssistanceLevel;
  error?: string | null;
  sourceType?: InterpretationSignal["sourceType"];
  valid?: boolean;
  eligible?: boolean;
}): InterpretationSignal {
  n++;
  return {
    id: `s${n}`,
    capabilityId: CAP.id,
    opportunityId: p.group ?? `o${n}`,
    independenceGroupKey: p.group ?? `o${n}`,
    sourceArtifactId: p.source ?? `src${n}`,
    sourceType: p.sourceType ?? "interactive_experience",
    performance: p.correct ? "correct" : "incorrect",
    polarity: p.correct ? "supports" : "challenges",
    demonstratedLevel: p.level ?? "apply",
    taskCognitiveDemand: p.level ?? "apply",
    normalizedErrorKey: p.correct ? null : (p.error === undefined ? "sm_prioritizes_backlog" : p.error),
    mappingConfidence: 1,
    qualityBand: p.band ?? "HIGH",
    assistanceLevel: p.assistance ?? "none",
    stateEligible: p.eligible ?? true,
    valid: p.valid ?? true,
    occurredAt: day(p.day),
  };
}

const now = day(30);

describe("Interpretation Engine — golden cases", () => {
  it("sin evidencia → Todavía no sabemos", () => {
    const r = interpretCapability(CAP, [], now);
    expect(r.visibleState).toBe("unknown");
    expect(r.evidenceSufficiency).toBe("none");
    expect(r.nextEvidenceNeed.type).toBe("more_evidence");
  });

  it("una correcta no crea solid", () => {
    const r = interpretCapability(CAP, [sig({ correct: true, day: 1 })], now);
    expect(r.maturityState).toBe("developing");
    expect(r.visibleState).toBe("in_development");
    expect(r.evidenceSufficiency).toBe("limited");
  });

  it("una incorrecta no crea review", () => {
    const r = interpretCapability(CAP, [sig({ correct: false, day: 1 })], now);
    expect(r.attentionState).toBe("none");
    expect(r.visibleState).not.toBe("needs_review");
    expect(r.errorPatterns[0].status).toBe("candidate");
  });

  it("dos oportunidades consistentes pueden crear solid", () => {
    const r = interpretCapability(CAP, [sig({ correct: true, day: 1 }), sig({ correct: true, day: 2 })], now);
    expect(r.visibleState).toBe("solid");
    expect(r.evidenceSufficiency).toBe("sufficient");
    expect(r.highestReliablyDemonstratedLevel).toBe("apply");
  });

  it("error confirmado en dos oportunidades independientes activa review", () => {
    const r = interpretCapability(
      CAP,
      [sig({ correct: false, day: 1, source: "a" }), sig({ correct: false, day: 2, source: "b" })],
      now,
    );
    expect(r.attentionState).toBe("review");
    expect(r.visibleState).toBe("needs_review");
    expect(r.errorPatterns[0]).toMatchObject({ status: "confirmed", rule: "A" });
    expect(r.nextEvidenceNeed).toMatchObject({ type: "error_retest", errorKey: "sm_prioritizes_backlog" });
  });

  it("regla B: dos escenarios de una misma experiencia confirman el patrón", () => {
    const r = interpretCapability(
      CAP,
      [sig({ correct: false, day: 1, source: "exp" }), sig({ correct: false, day: 1, source: "exp" })],
      now,
    );
    expect(r.errorPatterns[0]).toMatchObject({ status: "confirmed", rule: "B" });
  });

  it("una correcta después de review no resuelve; dos sí (I:1617-1649)", () => {
    const base = [sig({ correct: false, day: 1, source: "a" }), sig({ correct: false, day: 2, source: "b" })];
    const one = interpretCapability(CAP, [...base, sig({ correct: true, day: 3 })], now);
    expect(one.visibleState).toBe("needs_review");
    const two = interpretCapability(CAP, [...base, sig({ correct: true, day: 3 }), sig({ correct: true, day: 4 })], now);
    expect(two.attentionState).toBe("none");
    expect(two.errorPatterns[0].status).toBe("resolved");
  });

  it("explicar bien después del error no lo resuelve: hace falta aplicar", () => {
    const r = interpretCapability(
      CAP,
      [
        sig({ correct: false, day: 1, source: "a" }),
        sig({ correct: false, day: 2, source: "b" }),
        sig({ correct: true, day: 3, level: "explain", band: "MEDIUM" }),
        sig({ correct: true, day: 4, level: "explain", band: "MEDIUM" }),
      ],
      now,
    );
    expect(r.visibleState).toBe("needs_review");
  });

  it("LOW nunca crea solid ni review", () => {
    const low = [
      sig({ correct: true, day: 1, band: "LOW" }),
      sig({ correct: true, day: 2, band: "LOW" }),
      sig({ correct: false, day: 3, band: "LOW" }),
      sig({ correct: false, day: 4, band: "LOW" }),
    ];
    const r = interpretCapability(CAP, low, now);
    expect(r.visibleState).toBe("unknown");
    expect(r.attentionState).toBe("none");
  });

  it("respuesta revelada no es evidencia positiva", () => {
    const r = interpretCapability(
      CAP,
      [sig({ correct: true, day: 1, assistance: "answer_revealed" }), sig({ correct: true, day: 2, assistance: "answer_revealed" })],
      now,
    );
    expect(r.visibleState).toBe("unknown");
  });

  it("solo con ayuda guiada no alcanza para solid", () => {
    const r = interpretCapability(
      CAP,
      [sig({ correct: true, day: 1, assistance: "scaffolded", band: "MEDIUM" }), sig({ correct: true, day: 2, assistance: "scaffolded", band: "MEDIUM" })],
      now,
    );
    expect(r.visibleState).toBe("in_development");
    expect(r.nextEvidenceNeed.type).toBe("unassisted_attempt");
  });

  it("explicar bien + fallar al aplicar → contradicción de nivel", () => {
    const r = interpretCapability(
      CAP,
      [
        sig({ correct: true, day: 1, level: "explain", band: "MEDIUM", sourceType: "educai_ai_chat" }),
        sig({ correct: false, day: 2, source: "x" }),
        sig({ correct: false, day: 3, source: "y" }),
      ],
      now,
    );
    expect(r.visibleState).toBe("needs_review");
    expect(r.contradictions.map((c) => c.type)).toContain("level");
  });

  it("borrar la fuente (señal invalidada) recalcula el estado", () => {
    const signals = [sig({ correct: false, day: 1, source: "a" }), sig({ correct: false, day: 2, source: "b" })];
    expect(interpretCapability(CAP, signals, now).visibleState).toBe("needs_review");
    const afterDelete = signals.map((s) => (s.sourceArtifactId === "b" ? { ...s, valid: false } : s));
    expect(interpretCapability(CAP, afterDelete, now).visibleState).toBe("in_development");
  });

  it("una falla aislada no destruye solid", () => {
    const r = interpretCapability(
      CAP,
      [sig({ correct: true, day: 1 }), sig({ correct: true, day: 2 }), sig({ correct: true, day: 3 }), sig({ correct: false, day: 4 })],
      now,
    );
    expect(r.visibleState).toBe("solid");
    expect(r.rationale.stateReasonCodes).toContain("ISOLATED_DIFFICULTY_PENDING_CONFIRMATION");
  });

  it("es determinista", () => {
    const s = [sig({ correct: true, day: 1 }), sig({ correct: false, day: 2 })];
    expect(interpretCapability(CAP, s, now)).toEqual(interpretCapability(CAP, s, now));
  });
});
