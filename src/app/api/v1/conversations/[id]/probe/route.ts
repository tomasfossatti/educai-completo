import { handle } from "@/lib/api";
import { startProbe } from "@/modules/tutor/service";

export const dynamic = "force-dynamic";

/** Cambio de modo server-side: aprendizaje → evidencia ("Ahora probalo por tu cuenta"). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    await startProbe(db, id, user.id);
    return { ok: true };
  }, "student")();
}
