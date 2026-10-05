import { and, eq } from "drizzle-orm";
import { handle, readJson } from "@/lib/api";
import { recommendationFeedback, recommendations } from "@/db/schema";
import { regenerateRecommendations, setRecommendationStatus } from "@/modules/recommendation/service";
import { track } from "@/modules/shared/outbox";
import { notFound } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/** "Tiene sentido" / "No estoy de acuerdo" (API:236-245). El desacuerdo nunca cambia la interpretación. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => {
    const body = await readJson<{ type: string; reason_code?: string; comment?: string }>(req);
    const [rec] = await db
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.id, id), eq(recommendations.targetScopeId, user.id)))
      .limit(1);
    if (!rec) throw notFound("Recomendación");
    if (body.type === "why_opened") {
      await track(db, "why_opened", { userId: user.id, courseSectionId: rec.courseSectionId, properties: { recommendation_id: id } });
      return { ok: true };
    }
    if (body.type !== "makes_sense" && body.type !== "disagree") return { ok: false };
    await db.insert(recommendationFeedback).values({ recommendationId: id, userId: user.id, feedbackType: body.type, reasonCode: body.reason_code ?? null, comment: body.comment ?? null });
    if (body.type === "disagree") {
      await setRecommendationStatus(db, id, "disagreed", body.reason_code);
      await regenerateRecommendations(db, user.id, rec.courseSectionId!, { reason: "El estudiante eligió otra acción." });
      await track(db, "recommendation_disagreed", { userId: user.id, courseSectionId: rec.courseSectionId, properties: { reason_code: body.reason_code } });
    }
    return { ok: true };
  }, "student")();
}
