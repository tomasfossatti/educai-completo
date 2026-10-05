import { getCurrentUser } from "@/modules/identity/session";
import { getDb } from "@/db/client";
import { apiError } from "@/lib/api";
import { learningReply, submitProbeAnswer, getConversationView } from "@/modules/tutor/service";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/**
 * POST /v1/conversations/{id}/messages (API:268-275).
 * - Modo aprendizaje: respuesta en streaming (texto plano por chunks).
 * - Modo evidencia: evalúa la respuesta y devuelve JSON con el resultado.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return apiError("UNAUTHENTICATED", "Tu sesión terminó.", 401);
  const db = await getDb();
  let body: { content?: string; quick?: "contrast" | "example" | null };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Mensaje inválido.", 422);
  }
  try {
    const conv = await getConversationView(db, user.id, id);
    if (conv.phase === "awaiting_answer") {
      const result = await submitProbeAnswer(db, user.id, id, String(body.content ?? ""));
      return Response.json({ mode: "evidence", result });
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await learningReply(db, user.id, id, String(body.content ?? ""), body.quick ?? null, (t) => controller.enqueue(encoder.encode(t)));
        } catch {
          controller.enqueue(encoder.encode("\n\n[No pudimos responder ahora. Tu mensaje quedó guardado; probá de nuevo.]"));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "x-educai-mode": "learning", "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DomainError) return apiError(err.code, err.message, err.status);
    console.error(err);
    return apiError("INTERNAL", "No pudimos procesar tu mensaje. Quedó guardado; probá de nuevo.", 500);
  }
}
