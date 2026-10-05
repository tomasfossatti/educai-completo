import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { recommendations } from "@/db/schema";
import { getCurrentUser } from "@/modules/identity/session";
import { setRecommendationStatus } from "@/modules/recommendation/service";
import { createPracticeExperience, startLaunchSession, startPracticeSession } from "@/modules/experience/service";
import { createConversation } from "@/modules/tutor/service";
import { track } from "@/modules/shared/outbox";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/**
 * POST/GET /v1/recommendations/{id}/start (API:230-234): idempotente. Según action_type devuelve
 * una sesión de experiencia, una conversación o una ruta.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const base = new URL(req.url);
  if (!user || user.role !== "student") return NextResponse.redirect(new URL(`/entrar?next=${encodeURIComponent(base.pathname)}`, base), 303);
  const db = await getDb();
  const [rec] = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.id, id), eq(recommendations.targetActor, "student"), eq(recommendations.targetScopeId, user.id)))
    .limit(1);
  if (!rec) return NextResponse.redirect(new URL("/estudiante?error=recomendacion", base), 303);
  const a = rec.actionSpec;
  try {
    let dest: string;
    if (a.launchId) {
      const s = await startLaunchSession(db, user.id, a.launchId);
      dest = `/estudiante/experiencias/${s.id}`;
    } else if (a.sessionId) {
      dest = `/estudiante/experiencias/${a.sessionId}`;
    } else if (a.format === "decision_scenario" && a.capabilityId) {
      const def = await createPracticeExperience(db, user.id, rec.courseSectionId!, a.capabilityId, { recommendationId: rec.id, errorKey: a.targetErrorKey });
      const s = await startPracticeSession(db, user.id, def.id, rec.id);
      // Guardar la sesión en la acción: volver a tocar "Empezar" retoma la misma sesión.
      await db.update(recommendations).set({ actionSpec: { ...a, sessionId: s.id, experienceDefinitionId: def.id } }).where(eq(recommendations.id, rec.id));
      dest = `/estudiante/experiencias/${s.id}`;
    } else if (a.capabilityId) {
      const intent = a.actionType === "transfer_challenge" ? "transfer" : a.actionType === "diagnostic_probe" || a.actionType === "independent_attempt" ? "probe" : "understand";
      const conv = await createConversation(db, user.id, rec.courseSectionId!, a.capabilityId, { intent, recommendationId: rec.id });
      await db.update(recommendations).set({ actionSpec: { ...a, href: `/estudiante/tutor/${conv.id}` } }).where(eq(recommendations.id, rec.id));
      dest = `/estudiante/tutor/${conv.id}`;
    } else {
      dest = a.href || "/estudiante";
    }
    await setRecommendationStatus(db, rec.id, "started");
    await track(db, "recommendation_started", { userId: user.id, courseSectionId: rec.courseSectionId, properties: { priority_class: rec.priorityClass, format: a.format } });
    return NextResponse.redirect(new URL(dest, base), 303);
  } catch (err) {
    const msg = err instanceof DomainError ? err.message : "No pudimos empezar la actividad.";
    return NextResponse.redirect(new URL(`/estudiante?error=${encodeURIComponent(msg)}`, base), 303);
  }
}
