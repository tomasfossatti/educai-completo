import { handle, readJson } from "@/lib/api";
import { changeUploadSection } from "@/modules/sources/import";

export const dynamic = "force-dynamic";

/** Cambiar de materia antes de confirmar (conversación que parece de otra materia). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const { sectionId } = await readJson<{ sectionId: string }>(req);
    await changeUploadSection(db, user.id, id, sectionId);
    return { ok: true };
  }, "student")();
}
