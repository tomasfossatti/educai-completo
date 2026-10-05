import { handle } from "@/lib/api";
import { completeSession } from "@/modules/experience/service";
import { track } from "@/modules/shared/outbox";

export const dynamic = "force-dynamic";

/** POST /v1/runtime/sessions/{id}/complete (API:639-641). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const result = await completeSession(db, user.id, id);
    await track(db, "recommendation_completed", { userId: user.id, properties: { session_id: id } });
    return result;
  }, "student")();
}
