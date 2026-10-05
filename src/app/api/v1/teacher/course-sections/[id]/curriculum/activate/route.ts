import { handle, readJson } from "@/lib/api";
import { activateDraft } from "@/modules/curriculum/setup";

export const dynamic = "force-dynamic";

/** POST /v1/teacher/course-sections/{id}/curriculum/activate (API:473-479). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const body = await readJson<{ draft: unknown }>(req);
    return activateDraft(db, user.id, id, body.draft);
  }, "teacher")();
}
