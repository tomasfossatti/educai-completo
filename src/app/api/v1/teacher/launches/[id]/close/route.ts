import { handle } from "@/lib/api";
import { closeLaunch } from "@/modules/experience/service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    await closeLaunch(db, user.id, id);
    return { ok: true };
  }, "teacher")();
}
