import "server-only";
import { createHash } from "node:crypto";
import { and, eq, inArray, like, notInArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { capabilityInterpretations, enrollments, experienceDefinitions, experienceSessions, launches, users } from "@/db/schema";
import { DomainError, notFound } from "@/modules/shared/errors";
import { assertTeacherOfSection } from "@/modules/academic/service";
import { completeSession, ingestEventBatch, startLaunchSession } from "@/modules/experience/service";
import { refreshProjection } from "@/modules/teacher-projection/service";
import { DEMO_DOMAIN, DEMO_STUDENT2_EMAIL, DEMO_STUDENT_EMAIL } from "@/db/seed/demo";

/**
 * MODO DEMO — Simula la participación de estudiantes sintéticos en un lanzamiento.
 * Solo genera ACCIONES (decisiones) de estudiantes sintéticos; todo lo demás pasa por el pipeline real:
 * runtime events → evidencia → interpretación → recomendación → proyección docente.
 * Nunca toca a las personas demo (Lucía, Nicolás), que se usan en vivo.
 */

function prng(seed: string) {
  let h = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const P_CORRECT: Record<string, number> = { needs_review: 0.72, in_development: 0.8, solid: 0.93, unknown: 0.75 };

export function demoModeEnabled() {
  return process.env.DEMO_MODE !== "false";
}

export async function simulateLaunchParticipation(db: DB, teacherId: string, launchId: string, opts: { count?: number } = {}) {
  if (!demoModeEnabled()) throw new DomainError("FORBIDDEN", "La simulación solo está disponible en modo demo.");
  const [launch] = await db.select().from(launches).where(eq(launches.id, launchId)).limit(1);
  if (!launch) throw notFound("Lanzamiento");
  await assertTeacherOfSection(db, teacherId, launch.courseSectionId);
  if (launch.status !== "open") throw new DomainError("CONFLICT", "El lanzamiento está cerrado.");
  const [def] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, launch.experienceDefinitionId)).limit(1);
  const d = def.definition;

  const already = await db.select({ sid: experienceSessions.studentUserId }).from(experienceSessions).where(eq(experienceSessions.launchId, launchId));
  const candidates = await db
    .select({ id: users.id, email: users.email })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentUserId))
    .where(
      and(
        eq(enrollments.courseSectionId, launch.courseSectionId),
        eq(enrollments.status, "active"),
        like(users.email, `%@${DEMO_DOMAIN}`),
        notInArray(users.email, [DEMO_STUDENT_EMAIL, DEMO_STUDENT2_EMAIL]),
        ...(already.length ? [notInArray(users.id, already.map((a) => a.sid))] : []),
      ),
    );
  // Semillas estables (email + experiencia): después de "Reiniciar demo" la simulación da el mismo resultado.
  const seedBase = `${def.title}:${d.steps.map((s) => s.scenarioKey).join(",")}`;
  const rnd0 = prng(`${seedBase}:pick`);
  const pool = [...candidates]
    .sort((a, b) => a.email.localeCompare(b.email))
    .map((c) => ({ c, k: rnd0() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
  const chosen = pool.slice(0, opts.count ?? Math.min(pool.length, 26));
  if (chosen.length === 0) return { simulated: 0 };

  const interps = await db
    .select()
    .from(capabilityInterpretations)
    .where(
      and(
        eq(capabilityInterpretations.courseSectionId, launch.courseSectionId),
        inArray(capabilityInterpretations.studentUserId, chosen.map((c) => c.id)),
        inArray(capabilityInterpretations.capabilityId, d.targetCapabilityIds),
      ),
    );

  const start = Date.now() - chosen.length * 4 * 60_000; // todo en el pasado reciente
  for (const [n, st] of chosen.entries()) {
    const rnd = prng(`${seedBase}:${st.email}`);
    const session = await startLaunchSession(db, st.id, launchId, { simulated: true });
    await db.update(experienceSessions).set({ isSimulated: true }).where(eq(experienceSessions.id, session.id));
    let seq = 0;
    let t = new Date(start + n * 4 * 60_000);
    const events: Record<string, unknown>[] = [
      { event_id: `${session.id}-start`, sequence_no: seq++, event_type: "experience_started", occurred_at: t.toISOString(), schema_version: "1.0", payload: { simulated: true } },
    ];
    for (const step of d.steps) {
      const it = interps.find((i) => i.studentUserId === st.id && i.capabilityId === step.capabilityId);
      const state = it?.visibleState ?? "unknown";
      const wantsHint = state === "needs_review" && rnd() < 0.2;
      t = new Date(t.getTime() + 40_000);
      if (wantsHint)
        events.push({ event_id: `${session.id}-${step.id}-h`, sequence_no: seq++, event_type: "hint_requested", step_id: step.id, opportunity_id: step.opportunityId, occurred_at: t.toISOString(), schema_version: "1.0", payload: {} });
      const correct = rnd() < P_CORRECT[state] + (wantsHint ? 0.1 : 0);
      const right = step.options.find((o) => o.correct)!;
      const wrongs = step.options.filter((o) => !o.correct);
      const ownError = wrongs.find((o) => o.errorKey && it?.unresolvedErrorKeys.includes(o.errorKey));
      const pick = correct ? right : (ownError && rnd() < 0.8 ? ownError : wrongs[Math.floor(rnd() * wrongs.length)]);
      events.push({ event_id: `${session.id}-${step.id}-d`, sequence_no: seq++, event_type: "decision_made", step_id: step.id, opportunity_id: step.opportunityId, occurred_at: new Date(t.getTime() + 20_000).toISOString(), schema_version: "1.0", payload: { option_id: pick.id } });
    }
    await ingestEventBatch(db, st.id, { session_id: session.id, batch_id: `sim-${session.id}`, sdk_version: "1.0.0", events });
    await completeSession(db, st.id, session.id, { refreshTeacher: false });
  }
  await refreshProjection(db, launch.courseSectionId);
  return { simulated: chosen.length };
}
