import "server-only";
import type { DB } from "@/db/client";
import { getSection } from "@/modules/academic/service";
import { recomputeInterpretations, type StateChange } from "@/modules/interpretation/service";
import { regenerateRecommendations } from "@/modules/recommendation/service";
import { refreshProjection } from "@/modules/teacher-projection/service";
import { emit } from "@/modules/shared/outbox";
import { VISIBLE_STATE_LABEL } from "@/modules/interpretation/engine";

/**
 * Cadena canónica (API:806-824), ejecutada en proceso:
 * evidence.signals_updated → interpretation.recompute → recommendation.regenerate → reporting.teacher_projection_refresh.
 * Es determinista y rápida; por eso el feedback al estudiante puede mostrarse en la misma respuesta (TA R6).
 */
export async function processStudentEvidence(
  db: DB,
  args: {
    studentId: string;
    sectionId: string;
    trigger: string;
    sourceArtifactId?: string | null;
    refreshTeacher?: boolean;
    now?: Date;
  },
): Promise<{ changes: StateChange[]; topRecommendationId: string | null }> {
  const now = args.now ?? new Date();
  await emit(db, {
    eventType: "evidence.signals_updated",
    aggregateType: "student_section",
    aggregateId: `${args.studentId}:${args.sectionId}`,
    courseSectionId: args.sectionId,
    payload: { trigger: args.trigger, source_artifact_id: args.sourceArtifactId ?? null },
  });
  const changes = await recomputeInterpretations(db, args.studentId, args.sectionId, {
    trigger: args.trigger,
    sourceArtifactId: args.sourceArtifactId,
    now,
  });
  const { subject } = await getSection(db, args.sectionId);
  const reason = changes.length
    ? `Nueva evidencia: ${changes.map((c) => `${c.from ? VISIBLE_STATE_LABEL[c.from] : "sin estado"} → ${VISIBLE_STATE_LABEL[c.to]}`).join(", ")}.`
    : "Nueva evidencia registrada.";
  const { topId } = await regenerateRecommendations(db, args.studentId, args.sectionId, { subjectName: subject.name, now, reason });
  if (args.refreshTeacher !== false) await refreshProjection(db, args.sectionId, { now });
  return { changes, topRecommendationId: topId };
}
