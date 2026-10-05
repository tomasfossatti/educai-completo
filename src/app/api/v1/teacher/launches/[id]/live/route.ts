import { handle } from "@/lib/api";
import { getLaunchLive } from "@/modules/experience/service";

export const dynamic = "force-dynamic";

/** Vista en vivo agregada (T-63). Polling simple en lugar de SSE para el MVP; payload solo agregado. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => getLaunchLive(db, user.id, id), "teacher")();
}
