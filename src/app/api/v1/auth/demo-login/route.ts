import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { encodeSession, rolesFor, SESSION_COOKIE, type Role } from "@/modules/identity/session";
import { track } from "@/modules/shared/outbox";

export const dynamic = "force-dynamic";

/** Ingreso con usuarios demo. Reemplazable por autenticación federada sin tocar la autorización. */
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const role = String(form.get("role") ?? "") as Role;
  const next = String(form.get("next") ?? "");
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const base = new URL(req.url);
  if (!u) return NextResponse.redirect(new URL("/entrar?error=usuario", base), 303);
  const roles = await rolesFor(u.id);
  if (!roles.includes(role)) return NextResponse.redirect(new URL("/entrar?error=rol", base), 303);
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : role === "teacher" ? "/docente" : "/estudiante";
  const res = NextResponse.redirect(new URL(dest, base), 303);
  res.cookies.set(SESSION_COOKIE, encodeSession(u.id, role), {
    httpOnly: true,
    sameSite: "lax",
    secure: base.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  await track(db, "session_started", { userId: u.id, properties: { role } });
  return res;
}
