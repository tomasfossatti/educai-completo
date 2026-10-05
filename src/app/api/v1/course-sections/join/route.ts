import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getCurrentUser } from "@/modules/identity/session";
import { joinSectionByCode } from "@/modules/student-view/service";
import { regenerateRecommendations } from "@/modules/recommendation/service";
import { emit } from "@/modules/shared/outbox";

export const dynamic = "force-dynamic";

/** POST /v1/course-sections/join (API:169-183). */
export async function POST(req: Request) {
  const base = new URL(req.url);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.redirect(new URL("/entrar", base), 303);
  const form = await req.formData();
  const db = await getDb();
  try {
    const r = await joinSectionByCode(db, user.id, String(form.get("code") ?? ""));
    if (!r.already) {
      await regenerateRecommendations(db, user.id, r.sectionId);
      await emit(db, { eventType: "academic.enrollment_activated", aggregateType: "enrollment", aggregateId: `${user.id}:${r.sectionId}`, courseSectionId: r.sectionId });
    }
    return NextResponse.redirect(new URL(r.already ? "/estudiante/materias?join=ya" : `/estudiante/materias/${r.sectionId}`, base), 303);
  } catch {
    return NextResponse.redirect(new URL("/estudiante/materias?join=error#unirme", base), 303);
  }
}
