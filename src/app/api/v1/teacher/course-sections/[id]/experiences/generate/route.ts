import { handle, readJson } from "@/lib/api";
import { generateClassExperience } from "@/modules/experience/service";
import { track } from "@/modules/shared/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /v1/teacher/experiences/generate (API:562-581). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const body = await readJson<{ findingId: string; variant?: number; instruction?: string }>(req);
    await track(db, "experience_generation_started", { userId: user.id, courseSectionId: id });
    const def = await generateClassExperience(db, user.id, id, body.findingId, { variant: body.variant ?? 0, instruction: body.instruction ?? null });
    return { definitionId: def.id, status: def.status, source: def.generationSource, review: def.qualityReview.overall };
  }, "teacher")();
}
