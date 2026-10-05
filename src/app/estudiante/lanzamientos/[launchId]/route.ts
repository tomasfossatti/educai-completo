import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getCurrentUser } from "@/modules/identity/session";
import { startLaunchSession } from "@/modules/experience/service";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/** Entrada a una actividad lanzada por el docente: crea o retoma la sesión del estudiante. */
export async function GET(req: Request, { params }: { params: Promise<{ launchId: string }> }) {
  const { launchId } = await params;
  const base = new URL(req.url);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.redirect(new URL(`/entrar?next=${encodeURIComponent(base.pathname)}`, base), 303);
  const db = await getDb();
  try {
    const s = await startLaunchSession(db, user.id, launchId);
    return NextResponse.redirect(new URL(`/estudiante/experiencias/${s.id}`, base), 303);
  } catch (err) {
    const msg = err instanceof DomainError ? err.message : "No pudimos abrir la actividad.";
    return NextResponse.redirect(new URL(`/estudiante?error=${encodeURIComponent(msg)}`, base), 303);
  }
}
