import { handle } from "@/lib/api";
import { requestHint } from "@/modules/tutor/service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    await requestHint(db, user.id, id);
    return { ok: true };
  }, "student")();
}
