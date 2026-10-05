import { handle } from "@/lib/api";
import { confirmTranscript } from "@/modules/sources/import";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /v1/uploads/{id}/confirm-transcript (API:338-340). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => confirmTranscript(db, user.id, id), "student")();
}
