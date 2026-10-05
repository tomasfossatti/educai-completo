import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, type DB } from "@/db/client";
import { getCurrentUser, type CurrentUser, type Role } from "@/modules/identity/session";
import { DomainError } from "@/modules/shared/errors";

/** Envelope de error estable (API_Event_Contracts §3): {error:{code,message,request_id,details}}. */
export function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, request_id: randomUUID(), details } }, { status });
}

export function handle<T>(fn: (ctx: { db: DB; user: CurrentUser }) => Promise<T>, role?: Role) {
  return async () => {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHENTICATED", "Tu sesión terminó. Volvé a ingresar.", 401);
    if (role && user.role !== role) return apiError("FORBIDDEN", "No tenés acceso a este recurso.", 403);
    try {
      const db = await getDb();
      const out = await fn({ db, user });
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof DomainError) return apiError(err.code, err.message, err.status, err.details);
      console.error("[educai] error de API", err);
      return apiError("INTERNAL", "Algo salió mal. No se perdió lo que hiciste; probá de nuevo.", 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new DomainError("VALIDATION", "El cuerpo de la solicitud no es JSON válido.");
  }
}
