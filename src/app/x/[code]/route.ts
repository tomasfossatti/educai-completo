import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { courseSections } from "@/db/schema";
import { getCurrentUser } from "@/modules/identity/session";
import { getLaunchByCode } from "@/modules/experience/service";

export const dynamic = "force-dynamic";

/** Deep link de QR/código (S-21, T-62): actividad lanzada o cátedra. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const base = new URL(req.url);
  const db = await getDb();
  const user = await getCurrentUser();
  const launch = await getLaunchByCode(db, code);
  if (launch) {
    if (!user || user.role !== "student") return NextResponse.redirect(new URL(`/entrar?next=${encodeURIComponent(`/x/${code}`)}`, base), 303);
    return NextResponse.redirect(new URL(`/estudiante/lanzamientos/${launch.id}`, base), 303);
  }
  const [section] = await db.select().from(courseSections).where(eq(courseSections.joinCode, code.toUpperCase())).limit(1);
  if (section) {
    if (!user || user.role !== "student") return NextResponse.redirect(new URL(`/entrar?next=${encodeURIComponent(`/x/${code}`)}`, base), 303);
    return NextResponse.redirect(new URL(`/estudiante/materias?codigo=${encodeURIComponent(section.joinCode)}#unirme`, base), 303);
  }
  return NextResponse.redirect(new URL("/entrar?error=codigo", base), 303);
}
