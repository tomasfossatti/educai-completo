import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { aiConversations, enrollments, evidenceSignals, experienceSessions, recommendations, sourceArtifacts } from "@/db/schema";
import { levelRank, type VisibleState } from "@/modules/shared/enums";
import { assertEnrolled, currentClassFrom, getSchedule, getSection, scheduleStatusFor } from "@/modules/academic/service";
import { getCurriculum } from "@/modules/curriculum/service";
import { getInterpretations } from "@/modules/interpretation/service";
import { ASSISTANCE_LABEL } from "@/modules/evidence/engine";
import { SOURCE_TYPE_LABEL } from "@/modules/sources/service";
import { DomainError } from "@/modules/shared/errors";

const ACTIVE = ["generated", "surfaced", "started"] as const;

/** S-22 Materia: ¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora? */
export async function getCourseHome(db: DB, studentId: string, sectionId: string) {
  await assertEnrolled(db, studentId, sectionId);
  const { section, subject } = await getSection(db, sectionId);
  const { capabilities, nodes } = await getCurriculum(db, sectionId);
  const currentClass = currentClassFrom(await getSchedule(db, sectionId));
  const interps = await getInterpretations(db, studentId, sectionId);
  const stateOf = (id: string): VisibleState => interps.find((i) => i.capabilityId === id)?.visibleState ?? "unknown";
  const recs = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.targetScopeId, studentId), eq(recommendations.courseSectionId, sectionId), inArray(recommendations.status, [...ACTIVE])))
    .orderBy(asc(recommendations.rank));
  const next = recs[0] ?? null;

  const withSchedule = capabilities.map((c) => ({ ...c, schedule: scheduleStatusFor(c.plannedClassNo, currentClass), state: stateOf(c.id) }));
  const introduced = withSchedule.filter((c) => c.schedule !== "not_introduced");
  const currentUnitId = introduced.filter((c) => c.schedule === "active").at(-1)?.unitId ?? introduced.at(-1)?.unitId ?? null;
  const unitCaps = withSchedule.filter((c) => c.unitId === currentUnitId && c.schedule !== "not_introduced");
  const focusId = next?.actionSpec.capabilityId ?? unitCaps.find((c) => c.state !== "solid")?.id ?? null;
  const focus = withSchedule.find((c) => c.id === focusId) ?? null;
  const unit = nodes.find((n) => n.id === currentUnitId);
  const upcoming = withSchedule.filter((c) => c.schedule === "not_introduced").slice(0, 3);
  const upcomingUnit = upcoming[0] ? nodes.find((n) => n.id === upcoming[0].unitId) : null;

  // "Cómo venís": priorizar lo que necesita atención, máximo 6.
  const order: Record<VisibleState, number> = { needs_review: 0, in_development: 1, unknown: 2, solid: 3 };
  const how = [...unitCaps].sort((a, b) => order[a.state] - order[b.state] || a.sortOrder - b.sortOrder).slice(0, 6);

  return {
    section: { id: section.id, name: section.name },
    subjectName: subject.name,
    unitTitle: unit?.title ?? null,
    unitDescription: unit?.description ?? null,
    objective: focus ? { capabilityId: focus.id, statement: focus.statement, state: focus.state } : null,
    next,
    how: how.map((c) => ({ id: c.id, label: c.shortLabel, statement: c.statement, state: c.state, level: c.targetCognitiveLevel })),
    canDo: withSchedule.filter((c) => c.state === "solid").map((c) => ({ id: c.id, statement: c.statement })),
    journey: unitCaps.map((c) => ({ target: c.targetCognitiveLevel, state: c.state })),
    upcoming: { unitTitle: upcomingUnit?.title ?? null, items: upcoming.map((c) => ({ id: c.id, statement: c.statement })) },
    otherRecs: recs.slice(1),
  };
}

/** S-23/S-24 Capacidad + evidencia propia (API:346-366). Solo el propio estudiante. */
export async function getCapabilityDetail(db: DB, studentId: string, sectionId: string, capabilityId: string) {
  await assertEnrolled(db, studentId, sectionId);
  const { capabilities } = await getCurriculum(db, sectionId);
  const cap = capabilities.find((c) => c.id === capabilityId);
  if (!cap) throw new DomainError("NOT_FOUND", "Capacidad no encontrada");
  const [interp] = (await getInterpretations(db, studentId, sectionId)).filter((i) => i.capabilityId === capabilityId);
  const signals = await db
    .select({ s: evidenceSignals, src: sourceArtifacts })
    .from(evidenceSignals)
    .innerJoin(sourceArtifacts, eq(sourceArtifacts.id, evidenceSignals.sourceArtifactId))
    .where(and(eq(evidenceSignals.studentUserId, studentId), eq(evidenceSignals.courseSectionId, sectionId), eq(evidenceSignals.capabilityId, capabilityId), eq(evidenceSignals.validityStatus, "valid")))
    .orderBy(desc(evidenceSignals.occurredAt));
  const srcIds = [...new Set(signals.map((x) => x.src.id))];
  const sessions = srcIds.length ? await db.select({ id: experienceSessions.id, src: experienceSessions.sourceArtifactId }).from(experienceSessions).where(inArray(experienceSessions.sourceArtifactId, srcIds)) : [];
  const convs = srcIds.length ? await db.select({ id: aiConversations.id, src: aiConversations.sourceArtifactId }).from(aiConversations).where(inArray(aiConversations.sourceArtifactId, srcIds)) : [];
  const [rec] = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.targetScopeId, studentId), eq(recommendations.courseSectionId, sectionId), inArray(recommendations.status, [...ACTIVE])))
    .orderBy(asc(recommendations.rank));
  const target = levelRank(cap.targetCognitiveLevel);
  return {
    capability: { id: cap.id, statement: cap.statement, label: cap.shortLabel, explanation: cap.studentExplanation, level: cap.targetCognitiveLevel, topic: cap.topicTitle },
    state: (interp?.visibleState ?? "unknown") as VisibleState,
    highestLevel: interp?.highestReliablyDemonstratedLevel ?? null,
    missing: interp?.nextEvidenceNeed?.reason ?? "Todavía no tenemos evidencia suficiente para decir cómo venís en esta capacidad.",
    contradiction: interp?.contradictions.find((c) => c.type === "level")?.interpretation ?? null,
    unresolvedErrors: (interp?.unresolvedErrorKeys ?? []).map((k) => { const e = cap.knownErrorTypes.find((x) => x.key === k); return e ? (e.studentLabel ?? e.label) : null; }).filter(Boolean) as string[],
    evidence: signals.map(({ s, src }) => ({
      id: s.id,
      date: s.occurredAt,
      source: SOURCE_TYPE_LABEL[src.sourceType] ?? src.sourceType,
      sourceTitle: src.title,
      observed: s.rationale,
      polarity: s.polarity,
      assistance: ASSISTANCE_LABEL[s.assistanceLevel],
      assisted: s.assistanceLevel === "scaffolded" || s.assistanceLevel === "substantial",
      practiceOnly: !s.stateEligible,
      belowTarget: levelRank(s.demonstratedLevel) < target && s.polarity === "supports",
      link: sessions.find((x) => x.src === src.id)
        ? `/estudiante/experiencias/${sessions.find((x) => x.src === src.id)!.id}`
        : convs.find((x) => x.src === src.id)
          ? `/estudiante/tutor/${convs.find((x) => x.src === src.id)!.id}`
          : null,
    })),
    relatedRec: rec && rec.actionSpec.capabilityId === cap.id ? rec : null,
  };
}

export async function joinSectionByCode(db: DB, studentId: string, code: string) {
  const { courseSections } = await import("@/db/schema");
  const [section] = await db.select().from(courseSections).where(eq(courseSections.joinCode, code.trim().toUpperCase())).limit(1);
  if (!section || section.status === "archived") throw new DomainError("NOT_FOUND", "No encontramos una cátedra con ese código.");
  const [existing] = await db.select().from(enrollments).where(and(eq(enrollments.courseSectionId, section.id), eq(enrollments.studentUserId, studentId))).limit(1);
  if (existing) return { sectionId: section.id, already: true };
  // Unirse a otra cátedra no repite el onboarding (EDU-0105).
  await db.insert(enrollments).values({ courseSectionId: section.id, studentUserId: studentId });
  return { sectionId: section.id, already: false };
}
