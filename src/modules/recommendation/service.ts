import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  experienceDefinitions,
  experienceSessions,
  launches,
  recommendationCapabilities,
  recommendationHistory,
  recommendations,
  recommendationSources,
} from "@/db/schema";
import { levelRank, type SourceType } from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import { currentClassFrom, getNextMilestone, getSchedule, listStudentSections, scheduleStatusFor } from "@/modules/academic/service";
import { getCurriculum, type CapabilityRecord } from "@/modules/curriculum/service";
import { getInterpretations } from "@/modules/interpretation/service";
import { eligibleSignals } from "@/modules/interpretation/engine";
import { loadSignals } from "@/modules/evidence/service";
import { hasPracticeBank } from "@/modules/experience/bank";
import { aiEnabled } from "@/modules/ai-gateway/gateway";
import { emit } from "@/modules/shared/outbox";
import { generateSectionCandidates, orchestrate, type EvidenceDigest, type SectionRecContext } from "./student-engine";
import type { ActionFormat, StudentRecommendationCandidate } from "./types";

const ACTIVE = ["generated", "surfaced", "started"] as const;

export const SOURCE_LABEL: Record<SourceType, string> = {
  educai_ai_chat: "en el tutor de Educai",
  external_ai_transcript: "en una conversación que subiste",
  interactive_experience: "en una actividad",
  structured_activity: "en un trabajo práctico",
  exit_ticket: "en el cierre de clase",
  project_artifact: "en un proyecto",
  student_explanation: "en una explicación",
};

const fmtDate = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Cordoba" });

export function canPracticeWithScenarios(cap: CapabilityRecord) {
  return levelRank(cap.targetCognitiveLevel) >= levelRank("apply") && (hasPracticeBank(cap.stableKey) || aiEnabled());
}

async function buildContext(db: DB, studentId: string, sectionId: string, subjectName: string, now: Date): Promise<SectionRecContext> {
  const { capabilities } = await getCurriculum(db, sectionId);
  const schedule = await getSchedule(db, sectionId);
  const currentClass = currentClassFrom(schedule);
  const interps = await getInterpretations(db, studentId, sectionId);
  const signals = eligibleSignals(await loadSignals(db, studentId, sectionId));

  const digests: Record<string, EvidenceDigest> = {};
  for (const cap of capabilities) {
    const s = signals.filter((x) => x.capabilityId === cap.id).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    if (s.length === 0) continue;
    const target = levelRank(cap.targetCognitiveLevel);
    const below = s.filter((x) => x.polarity === "supports" && levelRank(x.demonstratedLevel) < target);
    const at = s.filter((x) => x.polarity === "supports" && levelRank(x.demonstratedLevel) >= target);
    const ch = s.filter((x) => x.polarity === "challenges");
    const byErr = new Map<string | null, number>();
    for (const x of ch) byErr.set(x.normalizedErrorKey, (byErr.get(x.normalizedErrorKey) ?? 0) + 1);
    const lastSup = [...below, ...at].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
    digests[cap.id] = {
      capabilityId: cap.id,
      supportsBelowTarget: below.length,
      supportsAtTarget: at.length,
      challengesByError: [...byErr.entries()].map(([errorKey, count]) => ({ errorKey, count })),
      lastSupportSourceLabel: lastSup ? `${SOURCE_LABEL[lastSup.sourceType]}, ${fmtDate(lastSup.occurredAt)}` : undefined,
    };
  }

  const openLaunchRows = await db
    .select({ launch: launches, def: experienceDefinitions })
    .from(launches)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.id, launches.experienceDefinitionId))
    .where(and(eq(launches.courseSectionId, sectionId), eq(launches.status, "open")));
  const mySessions = await db
    .select()
    .from(experienceSessions)
    .where(and(eq(experienceSessions.studentUserId, studentId), eq(experienceSessions.courseSectionId, sectionId)));
  const openLaunches = openLaunchRows.map(({ launch, def }) => ({
    launchId: launch.id,
    title: def.title,
    capabilityIds: def.definition.targetCapabilityIds,
    estimatedMinutes: def.definition.estimatedMinutes,
    completed: mySessions.some((s) => s.launchId === launch.id && s.status === "completed"),
  }));

  const resumableRows = await db
    .select({ session: experienceSessions, def: experienceDefinitions })
    .from(experienceSessions)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.id, experienceSessions.experienceDefinitionId))
    .where(
      and(
        eq(experienceSessions.studentUserId, studentId),
        eq(experienceSessions.courseSectionId, sectionId),
        inArray(experienceSessions.status, ["created", "active"]),
        isNull(experienceSessions.launchId),
      ),
    );
  const resumable = resumableRows
    .filter((r) => Object.keys(r.session.state.answers).length > 0)
    .map((r) => ({
      sessionId: r.session.id,
      title: r.def.title,
      capabilityId: r.def.definition.targetCapabilityIds[0] ?? null,
      lastActivityAt: r.session.lastActivityAt,
      answered: Object.keys(r.session.state.answers).length,
      total: r.def.definition.steps.length,
    }));

  const recs = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.targetActor, "student"), eq(recommendations.targetScopeId, studentId), eq(recommendations.courseSectionId, sectionId)))
    .orderBy(desc(recommendations.updatedAt));
  const recentFormats: Record<string, ActionFormat[]> = {};
  for (const r of recs.filter((r) => r.status === "completed")) {
    const cap = r.actionSpec.capabilityId;
    if (!cap) continue;
    (recentFormats[cap] ??= []).push(r.actionSpec.format);
  }
  const milestone = await getNextMilestone(db, sectionId, now);

  return {
    courseSectionId: sectionId,
    subjectName,
    capabilities: capabilities.map((c) => ({
      id: c.id,
      shortLabel: c.shortLabel,
      statement: c.statement,
      targetLevel: c.targetCognitiveLevel,
      importance: c.importance,
      sortOrder: c.sortOrder,
      scheduleStatus: scheduleStatusFor(c.plannedClassNo, currentClass),
      prerequisiteIds: c.prerequisiteIds,
      knownErrorTypes: c.knownErrorTypes,
      hasScenarioBank: canPracticeWithScenarios(c),
    })),
    interpretations: Object.fromEntries(
      interps.map((i) => [
        i.capabilityId,
        {
          capabilityId: i.capabilityId,
          visibleState: i.visibleState,
          evidenceSufficiency: i.evidenceSufficiency,
          nextEvidenceNeed: i.nextEvidenceNeed,
          unresolvedErrorKeys: i.unresolvedErrorKeys,
          contradictions: i.contradictions,
          eligibleOpportunityCount: i.eligibleOpportunityCount,
          interpretationId: i.id,
        },
      ]),
    ),
    digests,
    openLaunches,
    resumable,
    nextAssessment: milestone ? { id: milestone.id, title: milestone.title, dueAt: milestone.dueAt } : null,
    recentFormats,
    disagreedContextHashes: recs.filter((r) => r.status === "disagreed" || r.status === "dismissed").map((r) => r.contextHash),
    now,
  };
}

/**
 * Regenera las recomendaciones de una cátedra para un estudiante.
 * Nunca borra: las anteriores pasan a `superseded` con motivo (R:1821-1867).
 */
export async function regenerateRecommendations(
  db: DB,
  studentId: string,
  sectionId: string,
  opts: { subjectName?: string; now?: Date; reason?: string } = {},
) {
  const now = opts.now ?? new Date();
  const ctx = await buildContext(db, studentId, sectionId, opts.subjectName ?? "", now);
  const candidates = generateSectionCandidates(ctx).slice(0, 3);
  const active = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.targetActor, "student"),
        eq(recommendations.targetScopeId, studentId),
        eq(recommendations.courseSectionId, sectionId),
        inArray(recommendations.status, [...ACTIVE]),
      ),
    );
  const keep = new Set<string>();
  const created: string[] = [];
  let topId: string | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const match = active.find((a) => a.contextHash === c.contextHash);
    if (match) {
      keep.add(match.id);
      if (match.rank !== i + 1) await db.update(recommendations).set({ rank: i + 1, updatedAt: now }).where(eq(recommendations.id, match.id));
      if (i === 0) topId = match.id;
      continue;
    }
    const id = await insertRecommendation(db, studentId, c, i + 1, now);
    created.push(id);
    if (i === 0) topId = id;
  }

  for (const old of active.filter((a) => !keep.has(a.id))) {
    await db
      .update(recommendations)
      .set({
        status: "superseded",
        supersededById: topId,
        supersessionReason: opts.reason ?? "Nueva evidencia cambió la prioridad.",
        updatedAt: now,
      })
      .where(eq(recommendations.id, old.id));
    await db.insert(recommendationHistory).values({ recommendationId: old.id, fromStatus: old.status, toStatus: "superseded", reason: opts.reason ?? "new_evidence" });
    await emit(db, { eventType: "recommendation.superseded", aggregateType: "recommendation", aggregateId: old.id, courseSectionId: sectionId });
  }
  return { topId, created };
}

async function insertRecommendation(db: DB, studentId: string, c: StudentRecommendationCandidate, rank: number, now: Date) {
  const [rec] = await db
    .insert(recommendations)
    .values({
      targetActor: "student",
      targetScopeId: studentId,
      courseSectionId: c.courseSectionId,
      domain: c.domain,
      mode: c.mode,
      priorityClass: c.priorityClass,
      priorityBand: c.priorityBand,
      rank,
      title: c.title,
      objective: c.objective,
      reasonCodes: c.reasonCodes,
      actionSpec: c.actionSpec,
      explanation: c.explanation,
      status: "generated",
      contextHash: c.contextHash,
      dueAt: c.dueAt ?? null,
      engineVersion: ENGINE_PARAMS.recommendationEngineVersion,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (c.capabilityIds.length)
    await db.insert(recommendationCapabilities).values(c.capabilityIds.map((capabilityId) => ({ recommendationId: rec.id, capabilityId }))).onConflictDoNothing();
  if (c.sources.length)
    await db.insert(recommendationSources).values(c.sources.map((s) => ({ recommendationId: rec.id, sourceType: s.sourceType, sourceId: s.sourceId, reasonCode: s.reasonCode })));
  await db.insert(recommendationHistory).values({ recommendationId: rec.id, fromStatus: null, toStatus: "generated" });
  await emit(db, {
    eventType: "recommendation.generated",
    aggregateType: "recommendation",
    aggregateId: rec.id,
    courseSectionId: c.courseSectionId,
    payload: { priority_class: c.priorityClass, reason_codes: c.reasonCodes },
  });
  return rec.id;
}

export async function setRecommendationStatus(
  db: DB,
  recId: string,
  to: "surfaced" | "started" | "completed" | "disagreed" | "dismissed",
  reason?: string,
) {
  const [rec] = await db.select().from(recommendations).where(eq(recommendations.id, recId)).limit(1);
  if (!rec || rec.status === to) return rec ?? null;
  if (to === "surfaced" && rec.status !== "generated") return rec;
  await db.update(recommendations).set({ status: to, updatedAt: new Date() }).where(eq(recommendations.id, recId));
  await db.insert(recommendationHistory).values({ recommendationId: recId, fromStatus: rec.status, toStatus: to, reason: reason ?? null });
  return { ...rec, status: to };
}

export type HomeRecommendation = typeof recommendations.$inferSelect & { subjectName: string };

/** GET /v1/me/home — una sola próxima acción, resume y otros pendientes (API:129-163). */
export async function getStudentHome(db: DB, studentId: string, now = new Date()) {
  const sections = await listStudentSections(db, studentId);
  const all: HomeRecommendation[] = [];
  for (const [i, s] of sections.entries()) {
    let recs = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.targetActor, "student"),
          eq(recommendations.targetScopeId, studentId),
          eq(recommendations.courseSectionId, s.section.id),
          inArray(recommendations.status, [...ACTIVE]),
        ),
      );
    if (recs.length === 0) {
      await regenerateRecommendations(db, studentId, s.section.id, { subjectName: s.subject.name, now });
      recs = await db
        .select()
        .from(recommendations)
        .where(
          and(
            eq(recommendations.targetActor, "student"),
            eq(recommendations.targetScopeId, studentId),
            eq(recommendations.courseSectionId, s.section.id),
            inArray(recommendations.status, [...ACTIVE]),
          ),
        );
    }
    for (const r of recs) all.push({ ...r, subjectName: s.subject.name, rank: r.rank + i * 0 });
  }
  const sectionOrder = new Map(sections.map((s, i) => [s.section.id, i]));
  const ordered = orchestrate(
    all.map((r) => ({
      recommendationId: r.id,
      courseSectionId: r.courseSectionId!,
      priorityClass: r.priorityClass,
      dueAt: r.dueAt,
      importanceHint: r.priorityBand === "urgent" ? 3 : r.priorityBand === "high" ? 2 : 1,
      estimatedMinutes: r.actionSpec.estimatedMinutes,
      sectionOrder: sectionOrder.get(r.courseSectionId!) ?? 99,
      rank: r.rank,
    })),
  );
  const byId = new Map(all.map((r) => [r.id, r]));
  const top = ordered[0] ? byId.get(ordered[0].recommendationId)! : null;
  const others = ordered.slice(1).map((o) => byId.get(o.recommendationId)!).filter((r) => r.actionSpec.format !== "session_resume" || r.id !== top?.id);
  const resumeRec = others.find((r) => r.priorityClass === "resume") ?? null;
  return {
    nextAction: top,
    resume: top?.priorityClass === "resume" ? null : resumeRec,
    otherPending: others.filter((r) => r.id !== resumeRec?.id).slice(0, 3),
    sections,
  };
}
