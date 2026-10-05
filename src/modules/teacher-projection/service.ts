import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  capabilityInterpretations,
  classFeedbackSummaries,
  classroomCapabilityProjection,
  classroomCapabilitySnapshots,
  evidenceEvents,
  evidenceSignals,
  experienceDefinitions,
  experienceSpecs,
  launches,
  profileVersions,
  teacherFindings,
  teacherFindingValidations,
} from "@/db/schema";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import { activeEnrollmentIds, assertTeacherOfSection, getSectionOverview, scheduleStatusFor } from "@/modules/academic/service";
import { getCurriculum, type CapabilityRecord } from "@/modules/curriculum/service";
import { EXPERIENCE_TITLES } from "@/modules/experience/bank";
import { emit } from "@/modules/shared/outbox";
import { aggregateCapability, computeFindings, pct, recommendIntervention, suppress, type FindingInput } from "./engine";
import type {
  CapabilityMapRowDTO,
  ClassroomProfileDTO,
  FindingCardDTO,
  FindingDetailDTO,
  TeacherHomeDTO,
} from "./dto";

const K = ENGINE_PARAMS.minAggregateCellSize;
const unitShort = (t: string) => t.replace(/^Unidad\s+\d+\s*·\s*/i, "");

/**
 * Proyección docente (DM §13). Lee estados individuales SOLO acá, dentro del agregador,
 * y persiste conteos sin student_user_id. Las vistas docentes leen únicamente esta proyección.
 */
export async function refreshProjection(db: DB, sectionId: string, opts: { label?: string; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const studentIds = await activeEnrollmentIds(db, sectionId);
  const enrolled = studentIds.length;
  const { capabilities } = await getCurriculum(db, sectionId);
  const rows = studentIds.length
    ? await db
        .select({
          capabilityId: capabilityInterpretations.capabilityId,
          visibleState: capabilityInterpretations.visibleState,
          evidenceSufficiency: capabilityInterpretations.evidenceSufficiency,
          unresolvedErrorKeys: capabilityInterpretations.unresolvedErrorKeys,
          contradictions: capabilityInterpretations.contradictions,
        })
        .from(capabilityInterpretations)
        .where(and(eq(capabilityInterpretations.courseSectionId, sectionId), inArray(capabilityInterpretations.studentUserId, studentIds)))
    : [];
  const aggRows = rows.map((r) => ({
    capabilityId: r.capabilityId,
    visibleState: r.visibleState,
    evidenceSufficiency: r.evidenceSufficiency,
    unresolvedErrorKeys: r.unresolvedErrorKeys,
    hasLevelContradiction: r.contradictions.some((c) => c.type === "level"),
  }));
  const sourceCounts = await db
    .select({ capabilityId: evidenceSignals.capabilityId, sourceType: evidenceSignals.sourceType, n: sql<number>`count(*)::int` })
    .from(evidenceSignals)
    .where(and(eq(evidenceSignals.courseSectionId, sectionId), eq(evidenceSignals.validityStatus, "valid"), eq(evidenceSignals.stateEligible, true)))
    .groupBy(evidenceSignals.capabilityId, evidenceSignals.sourceType);

  const previous = await db.select().from(classroomCapabilityProjection).where(eq(classroomCapabilityProjection.courseSectionId, sectionId));
  const prevByCap = new Map(previous.map((p) => [p.capabilityId, p]));

  for (const cap of capabilities) {
    const a = aggregateCapability(cap.id, enrolled, aggRows);
    const prev = prevByCap.get(cap.id);
    const lastSnap = await db
      .select()
      .from(classroomCapabilitySnapshots)
      .where(and(eq(classroomCapabilitySnapshots.courseSectionId, sectionId), eq(classroomCapabilitySnapshots.capabilityId, cap.id)))
      .orderBy(desc(classroomCapabilitySnapshots.capturedAt))
      .limit(1);
    let trend: "improving" | "stable" | "worsening" | "unknown" = "unknown";
    const snap = lastSnap[0];
    if (snap && snap.evidenceSufficientCount >= K && a.needsReviewRate !== null) {
      const before = snap.needsReviewCount / snap.evidenceSufficientCount;
      const delta = a.needsReviewRate - before;
      trend = delta <= -0.05 ? "improving" : delta >= 0.05 ? "worsening" : "stable";
    }
    const values = {
      courseSectionId: sectionId,
      capabilityId: cap.id,
      enrolledCount: a.enrolledCount,
      evidenceSufficientCount: a.evidenceSufficientCount,
      withAnyEvidenceCount: a.withAnyEvidenceCount,
      unknownCount: a.unknownCount,
      developingCount: a.developingCount,
      solidCount: a.solidCount,
      needsReviewCount: a.needsReviewCount,
      needsReviewRate: a.needsReviewRate,
      evidenceCoverage: a.evidenceCoverage,
      confirmedErrorPatterns: a.confirmedErrorPatterns,
      cognitiveGapCount: a.cognitiveGapCount,
      contradictionCount: a.contradictionCount,
      sourceTypeCounts: Object.fromEntries(sourceCounts.filter((s) => s.capabilityId === cap.id).map((s) => [s.sourceType, Number(s.n)])),
      trend,
      projectionVersion: (prev?.projectionVersion ?? 0) + 1,
      computedAt: now,
    };
    await db
      .insert(classroomCapabilityProjection)
      .values(values)
      .onConflictDoUpdate({ target: [classroomCapabilityProjection.courseSectionId, classroomCapabilityProjection.capabilityId], set: values });
    if (opts.label) {
      await db.insert(classroomCapabilitySnapshots).values({
        courseSectionId: sectionId,
        capabilityId: cap.id,
        label: opts.label,
        evidenceSufficientCount: a.evidenceSufficientCount,
        needsReviewCount: a.needsReviewCount,
        solidCount: a.solidCount,
        enrolledCount: a.enrolledCount,
        capturedAt: now,
      });
    }
  }
  await refreshFindings(db, sectionId, capabilities, now);
  await emit(db, { eventType: "reporting.teacher_projection_updated", aggregateType: "course_section", aggregateId: sectionId, courseSectionId: sectionId });
}

async function findingInputs(db: DB, sectionId: string, capabilities: CapabilityRecord[], currentClass: number): Promise<FindingInput[]> {
  const proj = await db.select().from(classroomCapabilityProjection).where(eq(classroomCapabilityProjection.courseSectionId, sectionId));
  const byCap = new Map(proj.map((p) => [p.capabilityId, p]));
  const out: FindingInput[] = [];
  for (const cap of capabilities) {
    const p = byCap.get(cap.id);
    if (!p) continue;
    const [snap] = await db
      .select()
      .from(classroomCapabilitySnapshots)
      .where(and(eq(classroomCapabilitySnapshots.courseSectionId, sectionId), eq(classroomCapabilitySnapshots.capabilityId, cap.id)))
      .orderBy(desc(classroomCapabilitySnapshots.capturedAt))
      .limit(1);
    out.push({
      capabilityId: cap.id,
      shortLabel: cap.shortLabel,
      statement: cap.statement,
      targetLevel: cap.targetCognitiveLevel,
      importance: cap.importance,
      scheduleStatus: scheduleStatusFor(cap.plannedClassNo, currentClass),
      prerequisiteOf: capabilities.filter((c) => c.prerequisiteIds.includes(cap.id)).map((c) => c.shortLabel),
      knownErrorTypes: cap.knownErrorTypes,
      previousRate: snap && snap.evidenceSufficientCount >= K ? snap.needsReviewCount / snap.evidenceSufficientCount : null,
      aggregate: {
        capabilityId: cap.id,
        enrolledCount: p.enrolledCount,
        evidenceSufficientCount: p.evidenceSufficientCount,
        withAnyEvidenceCount: p.withAnyEvidenceCount,
        unknownCount: p.unknownCount,
        developingCount: p.developingCount,
        solidCount: p.solidCount,
        needsReviewCount: p.needsReviewCount,
        needsReviewRate: p.needsReviewRate,
        evidenceCoverage: p.evidenceCoverage,
        confirmedErrorPatterns: p.confirmedErrorPatterns,
        cognitiveGapCount: p.cognitiveGapCount,
        contradictionCount: p.contradictionCount,
      },
    });
  }
  return out;
}

async function refreshFindings(db: DB, sectionId: string, capabilities: CapabilityRecord[], now: Date) {
  const overview = await getSectionOverview(db, sectionId, now);
  const inputs = await findingInputs(db, sectionId, capabilities, overview.currentClass);
  const drafts = computeFindings(inputs, { assessmentInDays: overview.milestoneInDays });
  const existing = await db.select().from(teacherFindings).where(eq(teacherFindings.courseSectionId, sectionId));
  const keep = new Set<string>();
  for (const [i, d] of drafts.entries()) {
    const values = {
      courseSectionId: sectionId,
      capabilityId: d.capabilityId,
      findingType: d.findingType,
      headline: d.headline,
      detail: d.detail,
      rationale: {
        reasonCodes: d.reasonCodes,
        rate: d.rate,
        numerator: d.numerator,
        denominator: d.denominator,
        enrolled: d.enrolled,
        dominantErrorKey: d.dominantErrorKey,
        cognitiveGapCount: d.cognitiveGapCount,
        assessmentInDays: overview.milestoneInDays,
        prerequisiteOf: inputs.find((x) => x.capabilityId === d.capabilityId)?.prerequisiteOf ?? [],
        score: d.score,
      },
      priority: i + 1,
      status: "active" as const,
      updatedAt: now,
    };
    const [row] = await db
      .insert(teacherFindings)
      .values(values)
      .onConflictDoUpdate({ target: [teacherFindings.courseSectionId, teacherFindings.capabilityId, teacherFindings.findingType], set: values })
      .returning();
    keep.add(row.id);
  }
  for (const f of existing.filter((f) => !keep.has(f.id) && f.status === "active")) {
    await db.update(teacherFindings).set({ status: "resolved", updatedAt: now }).where(eq(teacherFindings.id, f.id));
  }
}

// ── Vistas docentes (DTOs sin identidad) ─────────────────────────────────────

function errorLabel(cap: CapabilityRecord | undefined, key: string | null) {
  if (!key) return null;
  return cap?.knownErrorTypes.find((e) => e.key === key)?.label ?? null;
}

async function interventionFor(db: DB, sectionId: string, finding: typeof teacherFindings.$inferSelect, cap: CapabilityRecord) {
  const draft = recommendIntervention(
    {
      capabilityId: finding.capabilityId,
      findingType: finding.findingType === "low_coverage" ? "low_coverage" : "needs_review",
      headline: finding.headline,
      detail: finding.detail,
      basis: "",
      reasonCodes: finding.rationale.reasonCodes,
      rate: finding.rationale.rate,
      numerator: finding.rationale.numerator,
      denominator: finding.rationale.denominator,
      enrolled: finding.rationale.enrolled,
      dominantErrorKey: finding.rationale.dominantErrorKey,
      dominantErrorLabel: errorLabel(cap, finding.rationale.dominantErrorKey),
      cognitiveGapCount: finding.rationale.cognitiveGapCount,
      score: finding.rationale.score,
    },
    {
      capabilityId: cap.id,
      shortLabel: cap.shortLabel,
      statement: cap.statement,
      targetLevel: cap.targetCognitiveLevel,
      importance: cap.importance,
      scheduleStatus: "active",
      prerequisiteOf: finding.rationale.prerequisiteOf,
      knownErrorTypes: cap.knownErrorTypes,
      aggregate: null as never,
      previousRate: null,
    },
    { experienceTitle: EXPERIENCE_TITLES[cap.stableKey]?.title ?? null },
  );
  const [spec] = await db
    .select({ def: experienceDefinitions })
    .from(experienceSpecs)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.experienceSpecId, experienceSpecs.id))
    .where(and(eq(experienceSpecs.courseSectionId, sectionId), eq(experienceSpecs.findingId, finding.id)))
    .orderBy(desc(experienceDefinitions.createdAt))
    .limit(1);
  const openLaunch = spec
    ? (await db.select().from(launches).where(and(eq(launches.experienceDefinitionId, spec.def.id), eq(launches.status, "open"))).limit(1))[0]
    : undefined;
  return {
    ...draft,
    existingDefinitionId: spec?.def.id ?? null,
    existingDefinitionTitle: spec?.def.title ?? null,
    openLaunchId: openLaunch?.id ?? null,
  };
}

function toCard(f: typeof teacherFindings.$inferSelect, cap: CapabilityRecord | undefined): FindingCardDTO {
  const r = f.rationale;
  return {
    findingId: f.id,
    type: f.findingType,
    capabilityLabel: cap?.shortLabel ?? "",
    headline: f.headline,
    detail: f.detail,
    rate: r.rate,
    numerator: r.numerator,
    denominator: r.denominator,
    enrolled: r.enrolled,
    priority: f.priority,
    reasonCodes: r.reasonCodes,
  };
}

export async function getTeacherHome(db: DB, teacherId: string, sectionId: string, now = new Date()): Promise<TeacherHomeDTO> {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const o = await getSectionOverview(db, sectionId, now);
  const { capabilities, nodes } = await getCurriculum(db, sectionId);
  const capById = new Map(capabilities.map((c) => [c.id, c]));
  const findings = await db
    .select()
    .from(teacherFindings)
    .where(and(eq(teacherFindings.courseSectionId, sectionId), eq(teacherFindings.status, "active")))
    .orderBy(teacherFindings.priority);
  const proj = await db.select().from(classroomCapabilityProjection).where(eq(classroomCapabilityProjection.courseSectionId, sectionId));
  const anyEvidence = proj.some((p) => p.withAnyEvidenceCount > 0);
  const priorities = findings.map((f) => toCard(f, capById.get(f.capabilityId)));
  const top = findings.find((f) => f.findingType === "needs_review") ?? findings[0];
  const recommended = top ? { findingId: top.id, ...(await interventionFor(db, sectionId, top, capById.get(top.capabilityId)!)) } : null;
  const [feedback] = await db
    .select()
    .from(classFeedbackSummaries)
    .where(eq(classFeedbackSummaries.courseSectionId, sectionId))
    .orderBy(desc(classFeedbackSummaries.createdAt))
    .limit(1);
  const currentUnit = nodes.find((n) => n.nodeType === "unit" && n.plannedClassNo !== null && n.plannedClassNo <= o.currentClass && !nodes.some((m) => m.nodeType === "unit" && m.plannedClassNo !== null && m.plannedClassNo <= o.currentClass && m.plannedClassNo > (n.plannedClassNo ?? 0)));
  const [openLaunch] = await db
    .select({ launch: launches, def: experienceDefinitions })
    .from(launches)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.id, launches.experienceDefinitionId))
    .where(and(eq(launches.courseSectionId, sectionId), eq(launches.status, "open")))
    .limit(1);
  const state: TeacherHomeDTO["state"] = !anyEvidence
    ? "no_evidence"
    : priorities.some((p) => p.type === "needs_review")
      ? "normal_priorities"
      : priorities.length > 0
        ? "low_coverage"
        : "no_attention_required";
  const sufficientAvg = proj.length ? proj.reduce((s, p) => s + p.evidenceCoverage, 0) / proj.length : 0;
  return {
    section: {
      id: o.section.id,
      name: o.section.name,
      term: o.section.term,
      subjectName: o.subject.name,
      joinCode: o.section.joinCode,
    },
    progress: {
      classIndex: o.currentClass,
      plannedClasses: o.totalClasses,
      timePct: o.totalClasses ? Math.round((o.currentClass / o.totalClasses) * 100) : 0,
      currentTopic: currentUnit ? unitShort(currentUnit.title) : null,
      currentClassTitle: o.currentSession?.title ?? null,
      nextMilestone: o.milestone ? { title: o.milestone.title, inDays: o.milestoneInDays ?? 0 } : null,
    },
    state,
    priorities,
    recommended,
    improvement: feedback
      ? {
          worked: feedback.worked,
          mainOpportunity: feedback.mainOpportunity,
          tryNext: feedback.tryNext,
          respondents: feedback.smallCellSuppressed ? null : feedback.respondentCount,
        }
      : null,
    coverage: { enrolled: o.enrolledCount, averageCoveragePct: Math.round(sufficientAvg * 100) },
    activeLaunch: openLaunch ? { launchId: openLaunch.launch.id, title: openLaunch.def.title, joinCode: openLaunch.launch.joinCode } : null,
  };
}

export async function getLearningMap(db: DB, teacherId: string, sectionId: string, now = new Date()) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const o = await getSectionOverview(db, sectionId, now);
  const { capabilities, nodes } = await getCurriculum(db, sectionId);
  const proj = await db.select().from(classroomCapabilityProjection).where(eq(classroomCapabilityProjection.courseSectionId, sectionId));
  const byCap = new Map(proj.map((p) => [p.capabilityId, p]));
  const findings = await db.select().from(teacherFindings).where(and(eq(teacherFindings.courseSectionId, sectionId), eq(teacherFindings.status, "active")));
  const row = (cap: CapabilityRecord): CapabilityMapRowDTO => {
    const p = byCap.get(cap.id);
    const schedule = scheduleStatusFor(cap.plannedClassNo, o.currentClass);
    const sufficient = p?.evidenceSufficientCount ?? 0;
    const enrolled = p?.enrolledCount ?? o.enrolledCount;
    const rate = p && sufficient >= K ? p.needsReviewRate : null;
    const status: CapabilityMapRowDTO["status"] =
      schedule === "not_introduced" && sufficient === 0
        ? "not_started"
        : sufficient < K || (p?.evidenceCoverage ?? 0) < ENGINE_PARAMS.lowCoverageThreshold
          ? rate !== null && rate >= ENGINE_PARAMS.minReviewRateForFinding
            ? "attention"
            : "insufficient_coverage"
          : rate !== null && rate >= ENGINE_PARAMS.minReviewRateForFinding
            ? "attention"
            : "ok";
    return {
      capabilityId: cap.id,
      label: cap.shortLabel,
      statement: cap.statement,
      level: cap.targetCognitiveLevel,
      schedule,
      enrolled,
      sufficient,
      coveragePct: enrolled ? Math.round((sufficient / enrolled) * 100) : 0,
      reviewRatePct: rate !== null ? Math.round(rate * 100) : null,
      reviewCount: rate !== null ? (p?.needsReviewCount ?? 0) : null,
      solidCount: suppress(sufficient, p?.solidCount ?? 0),
      trend: p?.trend ?? "unknown",
      status,
      findingId: findings.find((f) => f.capabilityId === cap.id)?.id ?? null,
    };
  };
  const units = nodes.filter((n) => n.nodeType === "unit");
  const modules = nodes.filter((n) => n.nodeType === "module");
  return {
    section: { id: o.section.id, subjectName: o.subject.name, name: o.section.name },
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      units: units
        .filter((u) => u.parentId === m.id)
        .map((u) => ({
          id: u.id,
          title: u.title,
          topics: nodes
            .filter((t) => t.parentId === u.id)
            .map((t) => ({ id: t.id, title: t.title, capabilities: capabilities.filter((c) => c.nodeId === t.id).map(row) })),
        })),
    })),
  };
}

export async function getFindingDetail(db: DB, teacherId: string, sectionId: string, findingId: string, now = new Date()): Promise<FindingDetailDTO> {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const [f] = await db.select().from(teacherFindings).where(and(eq(teacherFindings.id, findingId), eq(teacherFindings.courseSectionId, sectionId))).limit(1);
  if (!f) {
    const { DomainError } = await import("@/modules/shared/errors");
    throw new DomainError("NOT_FOUND", "Hallazgo no encontrado");
  }
  const { capabilities } = await getCurriculum(db, sectionId);
  const cap = capabilities.find((c) => c.id === f.capabilityId)!;
  const [p] = await db
    .select()
    .from(classroomCapabilityProjection)
    .where(and(eq(classroomCapabilityProjection.courseSectionId, sectionId), eq(classroomCapabilityProjection.capabilityId, cap.id)));
  const studentIds = await activeEnrollmentIds(db, sectionId);

  // Ejemplos anonimizados: qué respuestas incorrectas se repiten (cuenta de estudiantes distintos, n ≥ 5).
  const examples: FindingDetailDTO["audit"]["examples"] = [];
  if (studentIds.length) {
    // Solo respuestas elegidas en experiencias instrumentadas: el texto es de la opción, no autoría del estudiante.
    const rows = await db
      .select({
        excerpt: evidenceSignals.studentExcerpt,
        errorKey: evidenceSignals.normalizedErrorKey,
        eventId: evidenceSignals.evidenceEventId,
        sid: evidenceSignals.studentUserId,
      })
      .from(evidenceSignals)
      .where(
        and(
          eq(evidenceSignals.courseSectionId, sectionId),
          eq(evidenceSignals.capabilityId, cap.id),
          eq(evidenceSignals.polarity, "challenges"),
          eq(evidenceSignals.validityStatus, "valid"),
          eq(evidenceSignals.sourceType, "interactive_experience"),
        ),
      );
    const byExcerpt = new Map<string, { errorKey: string | null; eventId: string; students: Set<string> }>();
    for (const r of rows) {
      if (!r.excerpt) continue;
      const cur = byExcerpt.get(r.excerpt) ?? { errorKey: r.errorKey, eventId: r.eventId, students: new Set<string>() };
      cur.students.add(r.sid);
      byExcerpt.set(r.excerpt, cur);
    }
    const top = [...byExcerpt.entries()]
      .filter(([, v]) => v.students.size >= K)
      .sort((a, b) => b[1].students.size - a[1].students.size)
      .slice(0, 3);
    for (const [excerpt, v] of top) {
      const [ev] = await db.select({ ctx: evidenceEvents.taskContext }).from(evidenceEvents).where(eq(evidenceEvents.id, v.eventId)).limit(1);
      examples.push({
        situation: String(ev?.ctx.situation ?? ""),
        question: String(ev?.ctx.question ?? ""),
        chosenAnswer: excerpt,
        students: v.students.size,
        errorLabel: errorLabel(cap, v.errorKey),
      });
    }
  }

  const patterns = (p?.confirmedErrorPatterns ?? []).map((e) => ({ label: errorLabel(cap, e.key) ?? e.key, count: e.count }));
  const shown = patterns.filter((e) => e.count >= K);
  const hiddenCount = patterns.filter((e) => e.count < K).reduce((s, e) => s + e.count, 0);

  const timelineRows = await db
    .select({ day: sql<string>`to_char(${evidenceSignals.occurredAt} at time zone 'America/Argentina/Cordoba', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(evidenceSignals)
    .where(and(eq(evidenceSignals.courseSectionId, sectionId), eq(evidenceSignals.capabilityId, cap.id), eq(evidenceSignals.validityStatus, "valid"), eq(evidenceSignals.stateEligible, true)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const validations = await db.select().from(teacherFindingValidations).where(eq(teacherFindingValidations.findingId, f.id)).orderBy(desc(teacherFindingValidations.createdAt)).limit(1);
  const r = f.rationale;
  const intervention = await interventionFor(db, sectionId, f, cap);
  const levelLabel: Record<string, string> = { recognize: "reconocer", explain: "explicar", apply: "aplicar", solve: "resolver", transfer: "transferir" };
  return {
    findingId: f.id,
    type: f.findingType,
    capability: { id: cap.id, label: cap.shortLabel, statement: cap.statement, level: cap.targetCognitiveLevel },
    decide: {
      headline: f.headline,
      detail: f.detail,
      intervention,
    },
    understand: {
      numerator: r.numerator,
      denominator: r.denominator,
      enrolled: r.enrolled,
      ratePct: r.rate !== null ? Math.round(r.rate * 100) : null,
      howCalculated:
        f.findingType === "low_coverage"
          ? `Solo ${r.numerator} de ${r.enrolled} estudiantes tienen evidencia suficiente sobre esta capacidad. Con esa cobertura no mostramos un porcentaje: no sería representativo del aula.`
          : `Contamos a los ${r.denominator} estudiantes con evidencia suficiente (al menos dos oportunidades independientes, con una sin ayuda y al nivel de “${levelLabel[cap.targetCognitiveLevel]}”). De ellos, ${r.numerator} muestran el mismo error en dos o más situaciones distintas sin haberlo corregido después. Los ${r.enrolled - r.denominator} restantes no entran en el porcentaje porque todavía no tenemos evidencia suficiente.`,
      cognitiveGap:
        r.reasonCodes.includes("CLASS_COGNITIVE_GAP") && r.cognitiveGapCount >= K
          ? `${r.cognitiveGapCount} de los ${r.numerator} explican bien cada rol por separado, pero se equivocan al decidir en situaciones concretas.`
          : null,
      reasons: r.reasonCodes,
      assessmentInDays: r.assessmentInDays,
      prerequisiteOf: r.prerequisiteOf,
    },
    audit: {
      sourceTypes: Object.entries(p?.sourceTypeCounts ?? {}).map(([type, count]) => ({ type, count })),
      patterns: shown,
      otherPatternsSuppressed: hiddenCount > 0,
      examples,
      examplesSuppressed: examples.length === 0,
      contradictions: p && p.contradictionCount >= K ? p.contradictionCount : null,
      timeline: timelineRows.map((t) => ({ day: t.day, evidenceCount: Number(t.n) })),
      lastValidation: validations[0]?.validation ?? null,
    },
  };
}

export async function validateFinding(
  db: DB,
  teacherId: string,
  sectionId: string,
  findingId: string,
  validation: "agree" | "partially_agree" | "disagree" | "not_sure",
  comment?: string,
) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const [f] = await db.select().from(teacherFindings).where(and(eq(teacherFindings.id, findingId), eq(teacherFindings.courseSectionId, sectionId))).limit(1);
  if (!f) return null;
  // La validación docente alimenta métricas de calidad; nunca cambia estados automáticamente (I:1697-1719).
  await db.insert(teacherFindingValidations).values({ findingId, teacherUserId: teacherId, validation, comment: comment ?? null });
  return true;
}

/** T-40 Tu aula: perfil agregado con supresión de celdas chicas. */
export async function getClassroomProfile(db: DB, teacherId: string, sectionId: string): Promise<ClassroomProfileDTO> {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const studentIds = await activeEnrollmentIds(db, sectionId);
  const profiles = studentIds.length
    ? await db.select({ payload: profileVersions.profilePayload, studentId: profileVersions.studentUserId }).from(profileVersions).where(inArray(profileVersions.studentUserId, studentIds))
    : [];
  const latest = new Map<string, (typeof profiles)[number]["payload"]>();
  for (const p of profiles) latest.set(p.studentId, p.payload);
  const n = latest.size;
  const count = (pick: (x: (typeof profiles)[number]["payload"]) => string[] | undefined) => {
    const m = new Map<string, number>();
    for (const pl of latest.values()) for (const v of pick(pl) ?? []) m.set(v, (m.get(v) ?? 0) + 1);
    const visible = [...m.entries()].filter(([, c]) => c >= K).sort((a, b) => b[1] - a[1]).map(([label, c]) => ({ label, count: c, pct: Math.round((c / n) * 100) }));
    const hidden = [...m.values()].filter((c) => c < K).length;
    return { visible, hiddenCategories: hidden };
  };
  const working = [...latest.values()].filter((p) => p.works).length;
  return {
    respondents: n,
    enrolled: studentIds.length,
    suppressed: n < K,
    interests: n >= K ? count((p) => p.interests) : { visible: [], hiddenCategories: 0 },
    exposure: n >= K ? count((p) => p.exposureAreas) : { visible: [], hiddenCategories: 0 },
    workingPct: n >= K && working >= K ? Math.round((working / n) * 100) : null,
  };
}

export { pct };
