import { handle, readJson } from "@/lib/api";
import { simulateLaunchParticipation } from "@/modules/demo/simulate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** MODO DEMO: estudiantes sintéticos responden a través del mismo runtime y pipeline. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const body = await readJson<{ count?: number }>(req).catch(() => ({}) as { count?: number });
    return simulateLaunchParticipation(db, user.id, id, { count: body.count });
  }, "teacher")();
}
