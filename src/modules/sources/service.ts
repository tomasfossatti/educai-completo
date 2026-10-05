import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { courseSections, evidenceSignals, sourceArtifacts, subjects } from "@/db/schema";
import { DomainError, notFound } from "@/modules/shared/errors";
import { invalidateSource } from "@/modules/evidence/service";
import { processStudentEvidence } from "@/modules/pipeline";
import { track } from "@/modules/shared/outbox";

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  educai_ai_chat: "Conversación con el tutor de Educai",
  external_ai_transcript: "Conversación con otra IA (subida por vos)",
  interactive_experience: "Actividad interactiva",
  structured_activity: "Trabajo práctico",
  exit_ticket: "Cierre de clase",
  project_artifact: "Proyecto",
  student_explanation: "Explicación",
};

/** S-60 Tus datos: fuentes propias del estudiante, con cuánta evidencia derivó cada una. */
export async function listMySources(db: DB, studentId: string) {
  const rows = await db
    .select({ src: sourceArtifacts, subject: subjects.name })
    .from(sourceArtifacts)
    .innerJoin(courseSections, eq(courseSections.id, sourceArtifacts.courseSectionId))
    .innerJoin(subjects, eq(subjects.id, courseSections.subjectId))
    .where(and(eq(sourceArtifacts.studentUserId, studentId), ne(sourceArtifacts.processingStatus, "deleted"), ne(sourceArtifacts.processingStatus, "needs_confirmation")))
    .orderBy(desc(sourceArtifacts.sourceCreatedAt));
  const ids = rows.map((r) => r.src.id);
  const counts = ids.length
    ? await db
        .select({ id: evidenceSignals.sourceArtifactId, n: sql<number>`count(*)::int` })
        .from(evidenceSignals)
        .where(and(inArray(evidenceSignals.sourceArtifactId, ids), eq(evidenceSignals.validityStatus, "valid")))
        .groupBy(evidenceSignals.sourceArtifactId)
    : [];
  return rows.map((r) => ({
    id: r.src.id,
    title: r.src.title,
    type: r.src.sourceType,
    typeLabel: SOURCE_TYPE_LABEL[r.src.sourceType] ?? r.src.sourceType,
    subjectName: r.subject,
    courseSectionId: r.src.courseSectionId,
    createdAt: r.src.sourceCreatedAt,
    evidenceCount: Number(counts.find((c) => c.id === r.src.id)?.n ?? 0),
    deletable: r.src.sourceType === "educai_ai_chat" || r.src.sourceType === "external_ai_transcript",
  }));
}

/**
 * Eliminar una fuente propia: deja de usarse, se invalida su evidencia derivada y se recalculan
 * interpretación, recomendaciones y proyección docente (DM §25.1, STU-014).
 */
export async function deleteMySource(db: DB, studentId: string, sourceId: string) {
  const [src] = await db.select().from(sourceArtifacts).where(eq(sourceArtifacts.id, sourceId)).limit(1);
  if (!src || src.studentUserId !== studentId) throw notFound("Fuente");
  if (src.sourceType !== "educai_ai_chat" && src.sourceType !== "external_ai_transcript")
    throw new DomainError("VALIDATION", "Las actividades de la cátedra no se pueden eliminar desde acá.");
  const scope = await invalidateSource(db, sourceId, "user");
  if (!scope) throw notFound("Fuente");
  const result = await processStudentEvidence(db, { studentId, sectionId: scope.sectionId, trigger: "source_deleted", sourceArtifactId: sourceId });
  await track(db, "evidence_source_deleted", { userId: studentId, courseSectionId: scope.sectionId });
  return { ...result, invalidatedCapabilities: scope.capabilityIds.length };
}
