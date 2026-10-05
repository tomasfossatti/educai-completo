import { handle, readJson } from "@/lib/api";
import { validateFinding } from "@/modules/teacher-projection/service";
import { track } from "@/modules/shared/outbox";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

const VALID = ["agree", "partially_agree", "disagree", "not_sure"] as const;

/** POST /v1/teacher/findings/{findingId}/validate (API:487-502). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const body = await readJson<{ sectionId: string; validation: string; comment?: string }>(req);
    const v = VALID.find((x) => x === body.validation);
    if (!v) throw new DomainError("VALIDATION", "Validación inválida.");
    const ok = await validateFinding(db, user.id, body.sectionId, id, v, body.comment);
    if (!ok) throw new DomainError("NOT_FOUND", "Hallazgo no encontrado");
    await track(db, "insight_validated", { userId: user.id, courseSectionId: body.sectionId, properties: { validation: v } });
    return { ok: true };
  }, "teacher")();
}
