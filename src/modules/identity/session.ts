import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { courseSectionTeachers, enrollments, users } from "@/db/schema";

/**
 * Autenticación demo: cookie firmada con HMAC. Reemplazable por autenticación federada (TA §6.1)
 * sin cambiar las reglas de autorización, que se resuelven siempre del lado del servidor.
 */

export const SESSION_COOKIE = "educai_session";
const secret = () => process.env.SESSION_SECRET ?? "educai-dev-secret-change-me";

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(userId: string, role: Role): string {
  const payload = `${userId}.${role}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): { userId: string; role: Role } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(parts[3]);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const role = parts[1] as Role;
  if (role !== "student" && role !== "teacher") return null;
  return { userId: parts[0], role };
}

export type Role = "student" | "teacher";
export type CurrentUser = { id: string; displayName: string; email: string; role: Role };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const s = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  if (!u || u.status !== "active") return null;
  return { id: u.id, displayName: u.displayName, email: u.email, role: s.role };
}

export async function requireStudent(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u || u.role !== "student") redirect("/entrar");
  return u;
}

export async function requireTeacher(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u || u.role !== "teacher") redirect("/entrar");
  return u;
}

/** Roles disponibles para un usuario: derivados de asignaciones y matrículas (DM:133). */
export async function rolesFor(userId: string): Promise<Role[]> {
  const db = await getDb();
  const [t] = await db.select().from(courseSectionTeachers).where(eq(courseSectionTeachers.teacherUserId, userId)).limit(1);
  const [e] = await db.select().from(enrollments).where(eq(enrollments.studentUserId, userId)).limit(1);
  const roles: Role[] = [];
  if (t) roles.push("teacher");
  if (e) roles.push("student");
  return roles;
}
