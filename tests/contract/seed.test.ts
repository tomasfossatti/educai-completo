import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
process.env.PGLITE_DIR = "memory";
process.env.EDUCAI_AI = "off";
import { closeDb, getDb, type DB } from "@/db/client";
import { capabilities, capabilityInterpretations, classroomCapabilityProjection, teacherFindings } from "@/db/schema";
import { demoUserIds } from "@/db/seed/demo";
import { getStudentHome } from "@/modules/recommendation/service";

/** Fija el escenario demo: los números salen de los motores, no de valores escritos a mano. */

let db: DB;
let ids: Awaited<ReturnType<typeof demoUserIds>>;

beforeAll(async () => {
  db = await getDb();
  ids = await demoUserIds(db);
});
afterAll(async () => closeDb());

async function proj(key: string) {
  const [cap] = await db.select().from(capabilities).where(and(eq(capabilities.courseSectionId, ids.sectionId!), eq(capabilities.stableKey, key)));
  const [p] = await db
    .select()
    .from(classroomCapabilityProjection)
    .where(and(eq(classroomCapabilityProjection.courseSectionId, ids.sectionId!), eq(classroomCapabilityProjection.capabilityId, cap.id)));
  return { cap, p };
}

describe("Escenario demo", () => {
  it("PO vs. SM: 12 de 27 con evidencia suficiente necesitan revisar (44%)", async () => {
    const { p } = await proj("CAP-SCRUM-03");
    expect(p.enrolledCount).toBe(36);
    expect(p.evidenceSufficientCount).toBe(27);
    expect(p.needsReviewCount).toBe(12);
    expect(Math.round(p.needsReviewRate! * 100)).toBe(44);
    expect(p.confirmedErrorPatterns[0]).toEqual({ key: "sm_prioritizes_backlog", count: 9 });
    expect(p.cognitiveGapCount).toBeGreaterThanOrEqual(6);
  });

  it("otras capacidades de la unidad", async () => {
    const art = (await proj("CAP-ART-01")).p;
    expect([art.needsReviewCount, art.evidenceSufficientCount]).toEqual([8, 25]);
    const plan = (await proj("CAP-EV-01")).p;
    expect([plan.needsReviewCount, plan.evidenceSufficientCount]).toEqual([4, 19]);
    const retro = (await proj("CAP-EV-02")).p;
    expect(retro.evidenceSufficientCount).toBe(8);
  });

  it("hallazgos docentes: dos de revisión y uno de baja cobertura, máximo 3", async () => {
    const f = await db
      .select()
      .from(teacherFindings)
      .where(and(eq(teacherFindings.courseSectionId, ids.sectionId!), eq(teacherFindings.status, "active")))
      .orderBy(teacherFindings.priority);
    expect(f.length).toBeLessThanOrEqual(3);
    expect(f[0].headline).toBe("44% necesita revisar Product Owner vs. Scrum Master");
    expect(f[0].rationale.reasonCodes).toEqual(expect.arrayContaining(["CLASS_COGNITIVE_GAP", "CLASS_ASSESSMENT_NEAR"]));
    expect(f.map((x) => x.findingType)).toEqual(["needs_review", "needs_review", "low_coverage"]);
  });

  it("Lucía: conviene revisar PO vs. SM, con contradicción de nivel", async () => {
    const { cap } = await proj("CAP-SCRUM-03");
    const [i] = await db
      .select()
      .from(capabilityInterpretations)
      .where(and(eq(capabilityInterpretations.studentUserId, ids.studentId!), eq(capabilityInterpretations.capabilityId, cap.id)));
    expect(i.visibleState).toBe("needs_review");
    expect(i.contradictions.map((c) => c.type)).toContain("level");
    const home = await getStudentHome(db, ids.studentId!);
    expect(home.nextAction?.title).toBe("Aclará Product Owner vs. Scrum Master");
    expect(home.nextAction?.actionSpec.format).toBe("decision_scenario");
    expect(home.sections).toHaveLength(2);
  });

  it("Nicolás: todo sólido → transferir", async () => {
    const home = await getStudentHome(db, ids.student2Id!);
    expect(home.nextAction?.priorityClass).toBe("transfer");
  });
});
