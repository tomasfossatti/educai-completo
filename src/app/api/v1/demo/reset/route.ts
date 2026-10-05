import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { resetDemo } from "@/db/seed/ensure";
import { demoModeEnabled } from "@/modules/demo/simulate";
import { SESSION_COOKIE } from "@/modules/identity/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Recrea el escenario demo desde cero (solo con DEMO_MODE). */
export async function POST(req: Request) {
  if (!demoModeEnabled()) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Modo demo deshabilitado." } }, { status: 403 });
  const db = await getDb();
  await resetDemo(db);
  const res = NextResponse.redirect(new URL("/entrar?reiniciado=1", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
