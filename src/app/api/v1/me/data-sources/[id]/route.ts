import { handle } from "@/lib/api";
import { deleteMySource } from "@/modules/sources/service";

export const dynamic = "force-dynamic";

/** DELETE /v1/me/data-sources/{id} (API:415-432): invalida y recalcula. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const r = await deleteMySource(db, user.id, id);
    return { status: "deleted", invalidated_capabilities: r.invalidatedCapabilities, changes: r.changes };
  }, "student")();
}
