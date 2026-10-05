import { handle } from "@/lib/api";
import { launchExperience } from "@/modules/experience/service";

export const dynamic = "force-dynamic";

/** POST /v1/teacher/experiences/{id}/launch: publica (inmutable) y abre con QR/código/link. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const l = await launchExperience(db, user.id, id);
    return { launchId: l.id, joinCode: l.joinCode, courseSectionId: l.courseSectionId };
  }, "teacher")();
}
