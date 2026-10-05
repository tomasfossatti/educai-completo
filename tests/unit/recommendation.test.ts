import { describe, expect, it } from "vitest";
import { generateSectionCandidates, orchestrate, type CapabilityMeta, type SectionRecContext } from "@/modules/recommendation/student-engine";
import { aggregateCapability, computeFindings, type FindingInput } from "@/modules/teacher-projection/engine";

/** Golden cases EDU-0607: teacher required, resume, review, prerequisite, no evidence, solid→transfer. */

const now = new Date("2026-10-05T12:00:00Z");
const cap = (id: string, over: Partial<CapabilityMeta> = {}): CapabilityMeta => ({
  id,
  shortLabel: id,
  statement: `Statement ${id}`,
  targetLevel: "apply",
  importance: "high",
  sortOrder: 1,
  scheduleStatus: "active",
  prerequisiteIds: [],
  knownErrorTypes: [{ key: "err", label: "Confunde roles", description: "" }],
  hasScenarioBank: true,
  ...over,
});

function ctx(over: Partial<SectionRecContext> = {}): SectionRecContext {
  return {
    courseSectionId: "sec",
    subjectName: "Materia",
    capabilities: [cap("A"), cap("B", { sortOrder: 2, prerequisiteIds: ["A"] })],
    interpretations: {},
    digests: {},
    openLaunches: [],
    resumable: [],
    nextAssessment: null,
    recentFormats: {},
    disagreedContextHashes: [],
    now,
    ...over,
  };
}

const interp = (capabilityId: string, visibleState: "unknown" | "in_development" | "solid" | "needs_review", extra = {}) => ({
  capabilityId,
  visibleState,
  evidenceSufficiency: visibleState === "unknown" ? ("none" as const) : ("sufficient" as const),
  nextEvidenceNeed: visibleState === "needs_review" ? { type: "error_retest" as const, errorKey: "err", reason: "" } : { type: "more_evidence" as const, reason: "" },
  unresolvedErrorKeys: visibleState === "needs_review" ? ["err"] : [],
  contradictions: [],
  eligibleOpportunityCount: 2,
  interpretationId: `i-${capabilityId}`,
  ...extra,
});

describe("Recommendation Engine — estudiante", () => {
  it("sin evidencia: diagnóstico de la capacidad introducida, no inventa otra cosa", () => {
    const c = generateSectionCandidates(ctx());
    expect(c[0].priorityClass).toBe("evidence_need");
    expect(c[0].actionSpec.actionType).toBe("diagnostic_probe");
  });

  it("review prioriza práctica focalizada en el error", () => {
    const c = generateSectionCandidates(ctx({ interpretations: { A: interp("A", "needs_review") } }));
    expect(c[0]).toMatchObject({ priorityClass: "review", mode: "remediate" });
    expect(c[0].actionSpec).toMatchObject({ actionType: "error_focused_practice", targetErrorKey: "err" });
  });

  it("prerrequisito en revisión bloquea avanzar a la capacidad dependiente", () => {
    const c = generateSectionCandidates(ctx({ interpretations: { A: interp("A", "needs_review") } }));
    expect(c.find((x) => x.capabilityIds.includes("B"))).toBeUndefined();
  });

  it("actividad requerida por docente gana sobre review y resume", () => {
    const c = generateSectionCandidates(
      ctx({
        interpretations: { A: interp("A", "needs_review") },
        openLaunches: [{ launchId: "L1", title: "¿Quién debería intervenir?", capabilityIds: ["A"], estimatedMinutes: 15, completed: false }],
        resumable: [{ sessionId: "S1", title: "Práctica", capabilityId: "A", lastActivityAt: new Date(now.getTime() - 3600_000), answered: 1, total: 4 }],
      }),
    );
    expect(c.map((x) => x.priorityClass).slice(0, 3)).toEqual(["teacher_required", "resume", "review"]);
  });

  it("resume vence pasadas 72 h", () => {
    const c = generateSectionCandidates(
      ctx({ resumable: [{ sessionId: "S1", title: "x", capabilityId: "A", lastActivityAt: new Date(now.getTime() - 80 * 3600_000), answered: 1, total: 4 }] }),
    );
    expect(c.some((x) => x.priorityClass === "resume")).toBe(false);
  });

  it("evaluación cercana vuelve urgente la revisión", () => {
    const c = generateSectionCandidates(
      ctx({ interpretations: { A: interp("A", "needs_review") }, nextAssessment: { id: "m", title: "1° Parcial", dueAt: new Date(now.getTime() + 5 * 86_400_000) } }),
    );
    expect(c[0]).toMatchObject({ priorityClass: "urgent", priorityBand: "urgent" });
    expect(c[0].reasonCodes).toContain("ASSESSMENT_NEAR");
  });

  it("todo sólido → transferir", () => {
    const c = generateSectionCandidates(ctx({ interpretations: { A: interp("A", "solid"), B: interp("B", "solid") } }));
    expect(c[0]).toMatchObject({ priorityClass: "transfer", mode: "transfer" });
  });

  it("no repite más de 2 veces seguidas el mismo formato", () => {
    const c = generateSectionCandidates(
      ctx({ interpretations: { A: interp("A", "needs_review") }, recentFormats: { A: ["decision_scenario", "decision_scenario"] } }),
    );
    expect(c[0].actionSpec.format).toBe("ai_tutor");
  });

  it("una recomendación rechazada no vuelve sin evidencia nueva", () => {
    const first = generateSectionCandidates(ctx({ interpretations: { A: interp("A", "needs_review") } }))[0];
    const again = generateSectionCandidates(ctx({ interpretations: { A: interp("A", "needs_review") }, disagreedContextHashes: [first.contextHash] }));
    expect(again[0]?.contextHash).not.toBe(first.contextHash);
  });

  it("orquestador global ordena por metadata, no por evidencia", () => {
    const o = orchestrate([
      { recommendationId: "r1", courseSectionId: "s1", priorityClass: "review", dueAt: null, importanceHint: 2, estimatedMinutes: 10, sectionOrder: 0, rank: 1 },
      { recommendationId: "r2", courseSectionId: "s2", priorityClass: "teacher_required", dueAt: null, importanceHint: 1, estimatedMinutes: 15, sectionOrder: 1, rank: 1 },
    ]);
    expect(o[0].recommendationId).toBe("r2");
  });
});

describe("Proyección docente y hallazgos", () => {
  const rows = [
    ...Array.from({ length: 12 }, () => ({ capabilityId: "A", visibleState: "needs_review" as const, evidenceSufficiency: "sufficient" as const, unresolvedErrorKeys: ["err"], hasLevelContradiction: true })),
    ...Array.from({ length: 15 }, () => ({ capabilityId: "A", visibleState: "solid" as const, evidenceSufficiency: "sufficient" as const, unresolvedErrorKeys: [], hasLevelContradiction: false })),
    ...Array.from({ length: 4 }, () => ({ capabilityId: "A", visibleState: "in_development" as const, evidenceSufficiency: "limited" as const, unresolvedErrorKeys: [], hasLevelContradiction: false })),
  ];

  it("denominador = estudiantes con evidencia suficiente (12/27, no 12/36)", () => {
    const a = aggregateCapability("A", 36, rows);
    expect(a.evidenceSufficientCount).toBe(27);
    expect(a.needsReviewCount).toBe(12);
    expect(Math.round(a.needsReviewRate! * 100)).toBe(44);
    expect(a.confirmedErrorPatterns).toEqual([{ key: "err", count: 12 }]);
  });

  const input = (aggregate: ReturnType<typeof aggregateCapability>, over: Partial<FindingInput> = {}): FindingInput => ({
    capabilityId: aggregate.capabilityId,
    shortLabel: "PO vs. SM",
    statement: "",
    targetLevel: "apply",
    importance: "critical",
    scheduleStatus: "active",
    prerequisiteOf: ["Resolver ambiguas"],
    knownErrorTypes: [{ key: "err", label: "Le asigna al SM la priorización", description: "" }],
    aggregate,
    previousRate: null,
    ...over,
  });

  it("hallazgo con n/N, patrón dominante y brecha cognitiva", () => {
    const f = computeFindings([input(aggregateCapability("A", 36, rows))], { assessmentInDays: 9 });
    expect(f[0]).toMatchObject({ findingType: "needs_review", numerator: 12, denominator: 27, headline: "44% necesita revisar PO vs. SM" });
    expect(f[0].reasonCodes).toEqual(expect.arrayContaining(["CLASS_COGNITIVE_GAP", "CLASS_PREREQUISITE_RISK", "CLASS_ASSESSMENT_NEAR"]));
  });

  it("menos de 5 con evidencia suficiente → no hay porcentaje, se pide observar mejor", () => {
    const small = aggregateCapability("A", 36, rows.slice(0, 3));
    const f = computeFindings([input(small)], { assessmentInDays: null });
    expect(f[0].findingType).toBe("low_coverage");
    expect(f[0].rate).toBeNull();
  });

  it("capacidad no introducida no genera hallazgos", () => {
    const f = computeFindings([input(aggregateCapability("A", 36, rows), { scheduleStatus: "not_introduced" })], { assessmentInDays: null });
    expect(f).toHaveLength(0);
  });
});
