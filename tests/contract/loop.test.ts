import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
process.env.PGLITE_DIR = "memory";
process.env.EDUCAI_AI = "off";
process.env.DEMO_MODE = "true";
import { closeDb, getDb, type DB } from "@/db/client";
import { capabilities, capabilityInterpretations, classroomCapabilityProjection, enrollments, users } from "@/db/schema";
import { demoUserIds } from "@/db/seed/demo";
import { getStudentHome } from "@/modules/recommendation/service";
import { getClassroomProfile, getFindingDetail, getLearningMap, getTeacherHome } from "@/modules/teacher-projection/service";
import {
  closeLaunch,
  completeSession,
  generateClassExperience,
  getLaunchLive,
  getLaunchResult,
  getSessionForPlayer,
  ingestEventBatch,
  launchExperience,
  startLaunchSession,
} from "@/modules/experience/service";
import { simulateLaunchParticipation } from "@/modules/demo/simulate";
import { deleteMySource, listMySources } from "@/modules/sources/service";

/**
 * Loop central end-to-end (Backlog slices 1 y 2):
 * hallazgo → experiencia → lanzamiento → evidencia del estudiante → interpretación → recomendación → proyección docente.
 */

let db: DB;
let ids: Awaited<ReturnType<typeof demoUserIds>>;
let capPoSm: string;

beforeAll(async () => {
  db = await getDb();
  ids = await demoUserIds(db);
  const [cap] = await db.select().from(capabilities).where(and(eq(capabilities.courseSectionId, ids.sectionId!), eq(capabilities.stableKey, "CAP-SCRUM-03")));
  capPoSm = cap.id;
});
afterAll(async () => closeDb());

const state = async (studentId: string, capId: string) =>
  (await db.select().from(capabilityInterpretations).where(and(eq(capabilityInterpretations.studentUserId, studentId), eq(capabilityInterpretations.capabilityId, capId))))[0];

describe("Loop central", () => {
  let launchId: string;
  let sessionId: string;

  it("el docente genera y lanza la experiencia recomendada para el hallazgo principal", async () => {
    const home = await getTeacherHome(db, ids.teacherId!, ids.sectionId!);
    expect(home.state).toBe("normal_priorities");
    const top = home.priorities[0];
    expect(top.numerator).toBe(12);
    expect(top.denominator).toBe(27);
    const def = await generateClassExperience(db, ids.teacherId!, ids.sectionId!, top.findingId);
    expect(def.status).toBe("preview_ready");
    expect(def.qualityReview.overall).not.toBe("fail");
    expect(def.definition.steps).toHaveLength(5);
    const launch = await launchExperience(db, ids.teacherId!, def.id);
    launchId = launch.id;
    expect(launch.joinCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("Lucía ve la actividad de su docente como próximo paso", async () => {
    const home = await getStudentHome(db, ids.studentId!);
    expect(home.nextAction?.priorityClass).toBe("teacher_required");
    expect(home.nextAction?.actionSpec.launchId).toBe(launchId);
  });

  it("el player no expone claves de respuesta; el feedback llega en el ack", async () => {
    const session = await startLaunchSession(db, ids.studentId!, launchId);
    sessionId = session.id;
    const view = await getSessionForPlayer(db, ids.studentId!, sessionId);
    expect(JSON.stringify(view.steps.map((s) => s.options))).not.toContain("correct");
    const { session: _s, def } = await (async () => {
      const { experienceDefinitions, experienceSessions } = await import("@/db/schema");
      const [ses] = await db.select().from(experienceSessions).where(eq(experienceSessions.id, sessionId));
      const [d] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, ses.experienceDefinitionId));
      return { session: ses, def: d };
    })();
    const events = [
      { event_id: `${sessionId}-start`, sequence_no: 0, event_type: "experience_started", occurred_at: new Date().toISOString(), schema_version: "1.0", payload: {} },
      ...def.definition.steps.map((s, i) => ({
        event_id: `${sessionId}-${s.id}`,
        sequence_no: i + 1,
        event_type: "decision_made",
        step_id: s.id,
        opportunity_id: s.opportunityId,
        occurred_at: new Date().toISOString(),
        schema_version: "1.0",
        payload: { option_id: s.options.find((o) => o.correct)!.id },
      })),
    ];
    const res = await ingestEventBatch(db, ids.studentId!, { session_id: sessionId, batch_id: "batch-1", events });
    expect(res.results.filter((r) => r.type === "feedback" && r.correct)).toHaveLength(5);
    // Reenvío idempotente: no duplica evidencia.
    const again = await ingestEventBatch(db, ids.studentId!, { session_id: sessionId, batch_id: "batch-1", events });
    expect(again.rejected).toHaveLength(0);
  });

  it("nueva evidencia cambia el estado y la próxima recomendación", async () => {
    expect((await state(ids.studentId!, capPoSm)).visibleState).toBe("needs_review");
    const fb = await completeSession(db, ids.studentId!, sessionId);
    expect(fb.correct).toBe(5);
    expect(fb.transitions[0]).toMatchObject({ from: "needs_review", to: "solid" });
    expect(fb.next?.title).not.toBe("Aclará Product Owner vs. Scrum Master");
    expect(fb.next?.title).toContain("Quién hace qué durante el Sprint");
    const [p] = await db
      .select()
      .from(classroomCapabilityProjection)
      .where(and(eq(classroomCapabilityProjection.courseSectionId, ids.sectionId!), eq(classroomCapabilityProjection.capabilityId, capPoSm)));
    expect([p.needsReviewCount, p.evidenceSufficientCount]).toEqual([11, 27]);
  });

  it("la participación del aula (demo) actualiza el agregado docente", async () => {
    const live0 = await getLaunchLive(db, ids.teacherId!, launchId);
    expect(live0.completed).toBe(1);
    expect(live0.steps[0].distribution).toBeNull(); // n < 5: suprimido
    const { simulated } = await simulateLaunchParticipation(db, ids.teacherId!, launchId);
    expect(simulated).toBeGreaterThan(15);
    const live = await getLaunchLive(db, ids.teacherId!, launchId);
    expect(live.steps[0].distribution).not.toBeNull();
    await closeLaunch(db, ids.teacherId!, launchId);
    const result = await getLaunchResult(db, ids.teacherId!, launchId);
    expect(result.before.ratePct).toBe(44);
    // La simulación usa semillas estables: el guion de demo puede citar este resultado.
    expect(result.after).toMatchObject({ ratePct: 24, numerator: 8, denominator: 34 });
    const home = await getTeacherHome(db, ids.teacherId!, ids.sectionId!);
    expect(home.priorities[0].headline).toBe("32% necesita revisar Product Backlog vs. Sprint Backlog");
  });

  it("borrar una fuente invalida su evidencia y recalcula", async () => {
    const sources = await listMySources(db, ids.studentId!);
    const chat = sources.find((s) => s.type === "educai_ai_chat")!;
    expect(chat.evidenceCount).toBeGreaterThan(0);
    await deleteMySource(db, ids.studentId!, chat.id);
    const after = await listMySources(db, ids.studentId!);
    expect(after.find((s) => s.id === chat.id)).toBeUndefined();
  });
});

describe("Privacidad docente (aggregate-only)", () => {
  it("ningún DTO docente contiene identidad de estudiantes", async () => {
    const studentRows = await db
      .select({ id: users.id, email: users.email, name: users.displayName })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentUserId))
      .where(eq(enrollments.courseSectionId, ids.sectionId!));
    const home = await getTeacherHome(db, ids.teacherId!, ids.sectionId!);
    const payloads = [
      home,
      await getLearningMap(db, ids.teacherId!, ids.sectionId!),
      ...(await Promise.all(home.priorities.map((p) => getFindingDetail(db, ids.teacherId!, ids.sectionId!, p.findingId)))),
      await getClassroomProfile(db, ids.teacherId!, ids.sectionId!),
    ];
    const blob = JSON.stringify(payloads);
    for (const s of studentRows) {
      expect(blob).not.toContain(s.id);
      expect(blob).not.toContain(s.email);
      expect(blob).not.toContain(s.name);
    }
  });

  it("un docente no accede a una cátedra ajena", async () => {
    const [other] = await db.select().from(users).where(eq(users.email, "diego.paz@demo.educai.local"));
    await expect(getTeacherHome(db, other.id, ids.sectionId!)).rejects.toThrow(/no encontrada/);
  });
});
