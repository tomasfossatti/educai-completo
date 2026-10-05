import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getCurrentUser } from "@/modules/identity/session";
import { createConversation } from "@/modules/tutor/service";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/** "Entender mejor" desde una capacidad: abre el tutor contextualizado (formulario HTML). */
export async function POST(req: Request) {
  const base = new URL(req.url);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.redirect(new URL("/entrar", base), 303);
  const form = await req.formData();
  const sectionId = String(form.get("sectionId") ?? "");
  const capabilityId = String(form.get("capabilityId") ?? "");
  const intent = (String(form.get("intent") ?? "understand") as "understand" | "probe" | "transfer");
  const db = await getDb();
  try {
    const conv = await createConversation(db, user.id, sectionId, capabilityId, { intent });
    return NextResponse.redirect(new URL(`/estudiante/tutor/${conv.id}`, base), 303);
  } catch (err) {
    const msg = err instanceof DomainError ? err.message : "No pudimos abrir el tutor.";
    return NextResponse.redirect(new URL(`/estudiante?error=${encodeURIComponent(msg)}`, base), 303);
  }
}
