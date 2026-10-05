import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  capabilityInterpretations,
  classroomCapabilityProjection,
  enrollments,
  experienceDefinitions,
  experienceSessions,
  experienceSpecs,
  launches,
  opportunities,
  rawInteractions,
  recommendations,
  runtimeEvents,
  sourceArtifacts,
  teacherFindings,
  type SessionState,
} from "@/db/schema";
import type { VisibleState } from "@/modules/shared/enums";
import { DomainError, notFound } from "@/modules/shared/errors";
import { emit, track } from "@/modules/shared/outbox";
import { assertEnrolled, assertTeacherOfSection, generateCode, getSection } from "@/modules/academic/service";
import { getCurriculum, type CapabilityRecord } from "@/modules/curriculum/service";
import { recordDecisionEvidence } from "@/modules/evidence/service";
import { processStudentEvidence } from "@/modules/pipeline";
import { getStudentHome, setRecommendationStatus } from "@/modules/recommendation/service";
import { refreshProjection } from "@/modules/teacher-projection/service";
import type { LaunchLiveDTO, LaunchResultDTO } from "@/modules/teacher-projection/dto";
import { VISIBLE_STATE_LABEL } from "@/modules/interpretation/engine";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import { generateScenariosWithAI } from "@/modules/ai-gateway/tasks/generate-scenarios";
import { aiEnabled } from "@/modules/ai-gateway/gateway";
import { RuntimeEventBatchSchema, type DecisionScenarioDefinition, type RuntimeEventBatch } from "./contract";
import { bankFor } from "./bank";
import { PLANNER_VERSION, bankToInput, buildDefinition, contentHash, reviewDefinition, selectScenarios, type ScenarioInput } from "./planner";

const K = ENGINE_PARAMS.minAggregateCellSize;

// ── Generación / publicación ─────────────────────────────────────────────────

async function usedScenarioKeys(db: DB, sectionId: string): Promise<Set<string>> {
  const defs = await db.select({ d: experienceDefinitions.definition }).from(experienceDefinitions).where(eq(experienceDefinitions.courseSectionId, sectionId));
  return new Set(defs.flatMap((r) => r.d.steps.map((s) => s.scenarioKey)));
}

async function insertDefinition(
  db: DB,
  args: {
    sectionId: string;
    cap: CapabilityRecord;
    def: DecisionScenarioDefinition;
    audience: "class_launch" | "individual_practice";
    source: "llm" | "bank" | "seed";
    findingId?: string | null;
    recommendationId?: string | null;
    targetErrorKeys: string[];
    teacherInstruction?: string | null;
    createdBy?: string | null;
    publish: boolean;
    keyPrefix?: string;
  },
) {
  const review = reviewDefinition(args.def, args.cap);
  const [spec] = await db
    .insert(experienceSpecs)
    .values({
      courseSectionId: args.sectionId,
      recommendationId: args.recommendationId ?? null,
      findingId: args.findingId ?? null,
      objective: args.def.learningObjective,
      targetCapabilityIds: args.def.targetCapabilityIds,
      targetCognitiveLevel: args.def.targetCognitiveLevel,
      participationScope: "individual",
      pedagogicalPattern: args.audience === "class_launch" ? "decision_scenario+puesta_en_comun" : "error_focused_practice",
      targetErrorKeys: args.targetErrorKeys,
      teacherInstruction: args.teacherInstruction ?? null,
      plannerVersion: PLANNER_VERSION,
      createdByUserId: args.createdBy ?? null,
    })
    .returning();
  const status = review.overall === "fail" ? "validation_failed" : args.publish ? "published" : "preview_ready";
  const [def] = await db
    .insert(experienceDefinitions)
    .values({
      experienceSpecId: spec.id,
      courseSectionId: args.sectionId,
      experienceKey: `${args.keyPrefix ?? "exp"}-${spec.id.slice(0, 8)}`,
      version: "1.0.0",
      title: args.def.title,
      audience: args.audience,
      generationSource: args.source,
      definition: args.def,
      qualityReview: review,
      contentHash: contentHash(args.def),
      status,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();
  await emit(db, {
    eventType: status === "published" ? "experience.published" : "experience.preview_ready",
    aggregateType: "experience_definition",
    aggregateId: def.id,
    courseSectionId: args.sectionId,
    payload: { audience: args.audience, source: args.source, review: review.overall },
  });
  return def;
}

/** T-60: Generar experiencia desde un hallazgo docente. Usa IA si está disponible; si falla, banco curado (EDU-1010). */
export async function generateClassExperience(
  db: DB,
  teacherId: string,
  sectionId: string,
  findingId: string,
  opts: { variant?: number; instruction?: string | null; preferAI?: boolean } = {},
) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const [finding] = await db.select().from(teacherFindings).where(and(eq(teacherFindings.id, findingId), eq(teacherFindings.courseSectionId, sectionId))).limit(1);
  if (!finding) throw notFound("Hallazgo");
  const { capabilities } = await getCurriculum(db, sectionId);
  const cap = capabilities.find((c) => c.id === finding.capabilityId);
  if (!cap) throw notFound("Capacidad");
  const { subject } = await getSection(db, sectionId);
  const [proj] = await db
    .select()
    .from(classroomCapabilityProjection)
    .where(and(eq(classroomCapabilityProjection.courseSectionId, sectionId), eq(classroomCapabilityProjection.capabilityId, cap.id)));
  const targetErrorKeys = (proj?.confirmedErrorPatterns ?? []).map((e) => e.key);
  const count = finding.findingType === "low_coverage" ? 4 : 5;
  const used = await usedScenarioKeys(db, sectionId);

  let def: DecisionScenarioDefinition | null = null;
  let source: "llm" | "bank" = "bank";
  const bank = bankFor(cap.stableKey);
  if ((opts.preferAI ?? true) && aiEnabled()) {
    const ai = await generateScenariosWithAI({
      db,
      courseSectionId: sectionId,
      capability: cap,
      subjectName: subject.name,
      count,
      targetErrorKeys,
      examples: bank.slice(0, 2).map(bankToInput),
      teacherInstruction: opts.instruction,
    });
    if (ai) {
      const candidate = buildDefinition({ capability: cap, scenarios: ai.scenarios, title: ai.title, description: ai.description, organization: ai.organization, intro: ai.intro, minutesPerStep: 3 });
      if (reviewDefinition(candidate, cap).overall !== "fail") {
        def = candidate;
        source = "llm";
      }
    }
  }
  if (!def) {
    if (bank.length < 3) {
      throw new DomainError(
        "UNAVAILABLE",
        aiEnabled()
          ? "No pudimos generar la experiencia interactiva. Probá de nuevo en unos minutos."
          : "Para generar experiencias de esta capacidad hace falta configurar la IA (ANTHROPIC_API_KEY).",
      );
    }
    const chosen = selectScenarios({ capabilityKey: cap.stableKey, count, targetErrorKeys, exclude: used, variant: opts.variant });
    def = buildDefinition({ capability: cap, scenarios: chosen.map(bankToInput), minutesPerStep: 3 });
  }
  const created = await insertDefinition(db, {
    sectionId,
    cap,
    def,
    audience: "class_launch",
    source,
    findingId,
    targetErrorKeys,
    teacherInstruction: opts.instruction,
    createdBy: teacherId,
    publish: false,
    keyPrefix: "clase",
  });
  await track(db, "experience_generated", { userId: teacherId, courseSectionId: sectionId, properties: { source, finding_id: findingId } });
  return created;
}

/** Práctica individual para una recomendación de estudiante (formato decision_scenario). */
export async function createPracticeExperience(
  db: DB,
  studentId: string,
  sectionId: string,
  capabilityId: string,
  opts: { recommendationId?: string | null; errorKey?: string | null; count?: number } = {},
) {
  const { capabilities } = await getCurriculum(db, sectionId);
  const cap = capabilities.find((c) => c.id === capabilityId);
  if (!cap) throw notFound("Capacidad");
  const seen = await db
    .select({ family: opportunities.opportunityFamilyKey })
    .from(opportunities)
    .where(and(eq(opportunities.studentUserId, studentId), eq(opportunities.courseSectionId, sectionId)));
  const seenKeys = new Set(seen.map((s) => s.family.replace(/^scenario:/, "")));
  const count = opts.count ?? 4;
  let scenarios: ScenarioInput[] = [];
  let source: "bank" | "llm" = "bank";
  if (bankFor(cap.stableKey).length >= 3) {
    scenarios = selectScenarios({ capabilityKey: cap.stableKey, count, targetErrorKeys: opts.errorKey ? [opts.errorKey] : [], exclude: seenKeys }).map(bankToInput);
  } else if (aiEnabled()) {
    const { subject } = await getSection(db, sectionId);
    const ai = await generateScenariosWithAI({ db, courseSectionId: sectionId, capability: cap, subjectName: subject.name, count, targetErrorKeys: opts.errorKey ? [opts.errorKey] : [], examples: [] });
    if (ai) {
      scenarios = ai.scenarios;
      source = "llm";
    }
  }
  if (scenarios.length < 2) throw new DomainError("UNAVAILABLE", "Todavía no hay una práctica disponible para esta capacidad.");
  const def = buildDefinition({ capability: cap, scenarios, title: `Práctica: ${cap.shortLabel}`, description: `Decidí en ${scenarios.length} situaciones concretas sobre ${cap.shortLabel}.` });
  return insertDefinition(db, {
    sectionId,
    cap,
    def,
    audience: "individual_practice",
    source,
    recommendationId: opts.recommendationId ?? null,
    targetErrorKeys: opts.errorKey ? [opts.errorKey] : [],
    publish: true,
    keyPrefix: "practica",
  });
}

export async function getDefinitionForTeacher(db: DB, teacherId: string, definitionId: string) {
  const [def] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, definitionId)).limit(1);
  if (!def) throw notFound("Experiencia");
  await assertTeacherOfSection(db, teacherId, def.courseSectionId);
  const [spec] = await db.select().from(experienceSpecs).where(eq(experienceSpecs.id, def.experienceSpecId)).limit(1);
  const defLaunches = await db.select().from(launches).where(eq(launches.experienceDefinitionId, def.id)).orderBy(desc(launches.createdAt));
  return { def, spec, launches: defLaunches };
}

/** Publicar vuelve inmutable la versión (DM:872). Re-chequea gates antes de publicar. */
export async function publishDefinition(db: DB, teacherId: string, definitionId: string) {
  const { def } = await getDefinitionForTeacher(db, teacherId, definitionId);
  if (def.status === "published") return def;
  if (def.qualityReview.overall === "fail") throw new DomainError("VALIDATION", "La experiencia no pasó los controles de calidad.");
  const [updated] = await db
    .update(experienceDefinitions)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(experienceDefinitions.id, def.id))
    .returning();
  await emit(db, { eventType: "experience.published", aggregateType: "experience_definition", aggregateId: def.id, courseSectionId: def.courseSectionId });
  return updated;
}

async function baselineFor(db: DB, sectionId: string, capabilityIds: string[]) {
  const proj = await db
    .select()
    .from(classroomCapabilityProjection)
    .where(and(eq(classroomCapabilityProjection.courseSectionId, sectionId), inArray(classroomCapabilityProjection.capabilityId, capabilityIds)));
  return Object.fromEntries(
    proj.map((p) => [p.capabilityId, { numerator: p.needsReviewCount, denominator: p.evidenceSufficientCount, enrolled: p.enrolledCount, rate: p.needsReviewRate }]),
  );
}

/** T-62: Lanzar experiencia (QR/código/link). Una sola experiencia abierta por cátedra a la vez. */
export async function launchExperience(db: DB, teacherId: string, definitionId: string) {
  const def = await publishDefinition(db, teacherId, definitionId);
  const open = await db.select().from(launches).where(and(eq(launches.courseSectionId, def.courseSectionId), eq(launches.status, "open")));
  for (const l of open) await db.update(launches).set({ status: "closed", closesAt: new Date() }).where(eq(launches.id, l.id));
  let joinCode = generateCode(6);
  for (let i = 0; i < 5; i++) {
    const [exists] = await db.select({ id: launches.id }).from(launches).where(eq(launches.joinCode, joinCode)).limit(1);
    if (!exists) break;
    joinCode = generateCode(6);
  }
  const [launch] = await db
    .insert(launches)
    .values({
      experienceDefinitionId: def.id,
      courseSectionId: def.courseSectionId,
      status: "open",
      joinCode,
      baseline: await baselineFor(db, def.courseSectionId, def.definition.targetCapabilityIds),
      createdByUserId: teacherId,
    })
    .returning();
  await emit(db, { eventType: "experience.launch_opened", aggregateType: "launch", aggregateId: launch.id, courseSectionId: def.courseSectionId });
  await track(db, "experience_launched", { userId: teacherId, courseSectionId: def.courseSectionId, properties: { launch_id: launch.id } });
  return launch;
}

export async function closeLaunch(db: DB, teacherId: string, launchId: string) {
  const [launch] = await db.select().from(launches).where(eq(launches.id, launchId)).limit(1);
  if (!launch) throw notFound("Lanzamiento");
  await assertTeacherOfSection(db, teacherId, launch.courseSectionId);
  if (launch.status === "open") {
    await db.update(launches).set({ status: "closed", closesAt: new Date() }).where(eq(launches.id, launchId));
    await refreshProjection(db, launch.courseSectionId, { label: `launch:${launchId}` });
    await emit(db, { eventType: "experience.launch_closed", aggregateType: "launch", aggregateId: launchId, courseSectionId: launch.courseSectionId });
  }
  return launch;
}

export async function getLaunchByCode(db: DB, code: string) {
  const [launch] = await db.select().from(launches).where(eq(launches.joinCode, code.trim().toUpperCase())).limit(1);
  return launch ?? null;
}

// ── Sesiones del estudiante ──────────────────────────────────────────────────

export async function createSession(
  db: DB,
  args: { studentId: string; def: typeof experienceDefinitions.$inferSelect; launchId?: string | null; recommendationId?: string | null; simulated?: boolean; now?: Date },
) {
  const now = args.now ?? new Date();
  const interps = await db
    .select()
    .from(capabilityInterpretations)
    .where(
      and(
        eq(capabilityInterpretations.studentUserId, args.studentId),
        eq(capabilityInterpretations.courseSectionId, args.def.courseSectionId),
        inArray(capabilityInterpretations.capabilityId, args.def.definition.targetCapabilityIds),
      ),
    );
  const before = Object.fromEntries(args.def.definition.targetCapabilityIds.map((id) => [id, interps.find((i) => i.capabilityId === id)?.visibleState ?? "unknown"]));
  const [src] = await db
    .insert(sourceArtifacts)
    .values({
      studentUserId: args.studentId,
      courseSectionId: args.def.courseSectionId,
      sourceType: "interactive_experience",
      title: args.def.title,
      provenanceQuality: "direct",
      processingStatus: "processing",
      parserVersion: "runtime-1.0",
      metadata: { definition_id: args.def.id, launch_id: args.launchId ?? null },
      sourceCreatedAt: now,
      createdAt: now,
    })
    .returning();
  const [session] = await db
    .insert(experienceSessions)
    .values({
      launchId: args.launchId ?? null,
      experienceDefinitionId: args.def.id,
      studentUserId: args.studentId,
      courseSectionId: args.def.courseSectionId,
      recommendationId: args.recommendationId ?? null,
      sourceArtifactId: src.id,
      status: "created",
      isSimulated: args.simulated ?? false,
      result: { before },
      lastActivityAt: now,
      createdAt: now,
    })
    .returning();
  return session;
}

export async function startLaunchSession(db: DB, studentId: string, launchId: string, opts: { simulated?: boolean; now?: Date } = {}) {
  const [launch] = await db.select().from(launches).where(eq(launches.id, launchId)).limit(1);
  if (!launch) throw notFound("Actividad");
  await assertEnrolled(db, studentId, launch.courseSectionId);
  const [existing] = await db
    .select()
    .from(experienceSessions)
    .where(and(eq(experienceSessions.launchId, launchId), eq(experienceSessions.studentUserId, studentId)))
    .orderBy(desc(experienceSessions.createdAt))
    .limit(1);
  if (existing) return existing;
  if (launch.status !== "open") throw new DomainError("CONFLICT", "La actividad ya fue cerrada por tu docente.");
  const [def] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, launch.experienceDefinitionId)).limit(1);
  return createSession(db, { studentId, def, launchId, simulated: opts.simulated, now: opts.now });
}

export async function startPracticeSession(db: DB, studentId: string, definitionId: string, recommendationId?: string | null) {
  const [def] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, definitionId)).limit(1);
  if (!def || def.status !== "published") throw notFound("Experiencia");
  await assertEnrolled(db, studentId, def.courseSectionId);
  return createSession(db, { studentId, def, recommendationId });
}

async function loadOwnSession(db: DB, studentId: string, sessionId: string) {
  const [row] = await db
    .select({ session: experienceSessions, def: experienceDefinitions })
    .from(experienceSessions)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.id, experienceSessions.experienceDefinitionId))
    .where(and(eq(experienceSessions.id, sessionId), eq(experienceSessions.studentUserId, studentId)))
    .limit(1);
  if (!row) throw notFound("Sesión");
  return row;
}

/** Vista del player: sin claves de respuesta. El feedback llega en el ack de cada decisión. */
export async function getSessionForPlayer(db: DB, studentId: string, sessionId: string) {
  const { session, def } = await loadOwnSession(db, studentId, sessionId);
  const d = def.definition;
  const { subject } = await getSection(db, def.courseSectionId);
  const caps = await getCurriculum(db, def.courseSectionId);
  return {
    sessionId: session.id,
    status: session.status,
    launchId: session.launchId,
    subjectName: subject.name,
    capabilityLabel: caps.capabilities.find((c) => c.id === d.targetCapabilityIds[0])?.shortLabel ?? "",
    title: d.title,
    description: d.description,
    objective: d.learningObjective,
    estimatedMinutes: d.estimatedMinutes,
    context: d.context,
    lastSequenceNo: session.lastSequenceNo,
    steps: d.steps.map((s) => {
      const answer = session.state.answers[s.id];
      const opt = answer ? s.options.find((o) => o.id === answer.optionId) : null;
      const correct = s.options.find((o) => o.correct)!;
      return {
        id: s.id,
        opportunityId: s.opportunityId,
        situation: s.situation,
        question: s.question,
        options: s.options.map((o) => ({ id: o.id, text: o.text })),
        hintsAvailable: Math.min(s.hints.length, d.assistancePolicy.maxHintsPerStep),
        hintsShown: s.hints.slice(0, session.state.hintsByStep[s.id] ?? 0),
        answer: answer
          ? { optionId: answer.optionId, correct: answer.correct, feedback: opt?.feedback ?? "", takeaway: s.takeaway, correctOptionId: correct.id, correctText: correct.text }
          : null,
      };
    }),
    result: session.status === "completed" ? (session.result as SessionFeedback | null) : null,
  };
}

export type EventResult =
  | { event_id: string; type: "hint"; stepId: string; hint: string; hintsUsed: number }
  | { event_id: string; type: "feedback"; stepId: string; correct: boolean; feedback: string; takeaway: string; correctOptionId: string; correctText: string }
  | { event_id: string; type: "ack" };

/** POST /v1/runtime/event-batches — persistir antes de ack, idempotente por event_id (TA:1865-1880). */
export async function ingestEventBatch(db: DB, studentId: string, input: unknown, opts: { now?: Date } = {}) {
  const parsed = RuntimeEventBatchSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", "Lote de eventos inválido", parsed.error.issues.slice(0, 3));
  const batch: RuntimeEventBatch = parsed.data;
  const { session, def } = await loadOwnSession(db, studentId, batch.session_id);
  if (session.status === "completed") throw new DomainError("CONFLICT", "La sesión ya terminó.");
  const d = def.definition;
  const state: SessionState = structuredClone(session.state);
  let lastSeq = session.lastSequenceNo;
  let status = session.status;
  let currentStep = session.currentStepIndex;
  const results: EventResult[] = [];
  const rejected: { event_id: string; reason: string }[] = [];
  const now = opts.now ?? new Date();
  let capsCache: CapabilityRecord[] | null = null;
  const capsOf = async () => (capsCache ??= (await getCurriculum(db, session.courseSectionId)).capabilities);

  for (const ev of [...batch.events].sort((a, b) => a.sequence_no - b.sequence_no)) {
    const step = ev.step_id ? d.steps.find((s) => s.id === ev.step_id) : undefined;
    if (ev.step_id && !step) {
      rejected.push({ event_id: ev.event_id, reason: "unknown_step" });
      continue;
    }
    if (step && ev.opportunity_id && ev.opportunity_id !== step.opportunityId) {
      rejected.push({ event_id: ev.event_id, reason: "unknown_opportunity" });
      continue;
    }
    if (ev.event_type === "decision_made" && step && state.answers[step.id]) {
      // Duplicado lógico: devolver el mismo feedback (idempotencia).
      const a = state.answers[step.id];
      const opt = step.options.find((o) => o.id === a.optionId)!;
      const correct = step.options.find((o) => o.correct)!;
      results.push({ event_id: ev.event_id, type: "feedback", stepId: step.id, correct: a.correct, feedback: opt.feedback, takeaway: step.takeaway, correctOptionId: correct.id, correctText: correct.text });
      continue;
    }
    const occurredAt = new Date(ev.occurred_at);
    const inserted = await db
      .insert(runtimeEvents)
      .values({
        sessionId: session.id,
        idempotencyKey: ev.event_id,
        eventType: ev.event_type,
        stepId: ev.step_id ?? null,
        opportunityId: ev.opportunity_id ?? null,
        sequenceNo: ev.sequence_no,
        payload: ev.payload,
        schemaVersion: ev.schema_version,
        sdkVersion: batch.sdk_version,
        occurredAt: isNaN(occurredAt.getTime()) ? now : occurredAt,
        receivedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: runtimeEvents.id });
    if (inserted.length === 0) {
      results.push({ event_id: ev.event_id, type: "ack" });
      continue;
    }
    lastSeq = Math.max(lastSeq, ev.sequence_no);

    switch (ev.event_type) {
      case "experience_started":
      case "experience_resumed":
        if (status === "created") status = "active";
        results.push({ event_id: ev.event_id, type: "ack" });
        break;
      case "step_viewed":
        if (step) currentStep = Math.max(currentStep, d.steps.indexOf(step));
        results.push({ event_id: ev.event_id, type: "ack" });
        break;
      case "hint_requested": {
        if (!step) break;
        // La asistencia queda registrada ANTES de devolver la pista (API:635-637).
        const used = Math.min((state.hintsByStep[step.id] ?? 0) + 1, Math.min(step.hints.length, d.assistancePolicy.maxHintsPerStep));
        state.hintsByStep[step.id] = used;
        results.push({ event_id: ev.event_id, type: "hint", stepId: step.id, hint: step.hints[used - 1] ?? "", hintsUsed: used });
        break;
      }
      case "decision_made": {
        if (!step) break;
        const optionId = String(ev.payload.option_id ?? "");
        const opt = step.options.find((o) => o.id === optionId);
        if (!opt) {
          rejected.push({ event_id: ev.event_id, reason: "unknown_option" });
          break;
        }
        status = "active";
        const hintsUsed = state.hintsByStep[step.id] ?? 0;
        const [raw] = await db
          .insert(rawInteractions)
          .values({
            sourceArtifactId: session.sourceArtifactId!,
            studentUserId: studentId,
            courseSectionId: session.courseSectionId,
            actor: "student",
            interactionType: "decision",
            contentText: opt.text,
            payload: { step_id: step.id, option_id: opt.id, hints_used: hintsUsed, runtime_event_id: inserted[0].id },
            sequenceNo: ev.sequence_no,
            occurredAt,
          })
          .returning();
        const cap = (await capsOf()).find((c) => c.id === step.capabilityId);
        const rec = await recordDecisionEvidence(db, {
          studentId,
          sectionId: session.courseSectionId,
          sourceArtifactId: session.sourceArtifactId!,
          sourceType: "interactive_experience",
          rawInteractionId: raw.id,
          sessionId: session.id,
          stepId: step.id,
          scenarioKey: step.scenarioKey,
          capabilityId: step.capabilityId,
          cognitiveDemand: step.cognitiveDemand,
          optionId: opt.id,
          optionText: opt.text,
          correct: opt.correct,
          errorKey: opt.errorKey ?? null,
          errorLabel: cap?.knownErrorTypes.find((e) => e.key === opt.errorKey)?.label ?? null,
          hintsUsed,
          answerRevealed: state.revealedSteps.includes(step.id),
          occurredAt,
          situation: step.situation,
          question: step.question,
        });
        state.answers[step.id] = { optionId: opt.id, correct: opt.correct, attemptNo: rec?.attemptNo ?? 1, hintsUsed };
        currentStep = Math.min(d.steps.length - 1, d.steps.indexOf(step) + 1);
        const correct = step.options.find((o) => o.correct)!;
        results.push({ event_id: ev.event_id, type: "feedback", stepId: step.id, correct: opt.correct, feedback: opt.feedback, takeaway: step.takeaway, correctOptionId: correct.id, correctText: correct.text });
        break;
      }
      case "reflection_submitted": {
        const text = String(ev.payload.text ?? "").slice(0, 2000);
        if (text)
          await db.insert(rawInteractions).values({
            sourceArtifactId: session.sourceArtifactId!,
            studentUserId: studentId,
            courseSectionId: session.courseSectionId,
            actor: "student",
            interactionType: "reflection",
            contentText: text,
            sequenceNo: ev.sequence_no,
            occurredAt,
          });
        results.push({ event_id: ev.event_id, type: "ack" });
        break;
      }
      default:
        results.push({ event_id: ev.event_id, type: "ack" });
    }
  }

  await db
    .update(experienceSessions)
    .set({ state, lastSequenceNo: lastSeq, status, currentStepIndex: currentStep, startedAt: session.startedAt ?? now, lastActivityAt: now })
    .where(eq(experienceSessions.id, session.id));
  return { accepted_through_sequence: lastSeq, rejected, results };
}

export type SessionFeedback = {
  before: Record<string, VisibleState>;
  correct: number;
  total: number;
  hintsUsed: number;
  strengthened: string[];
  toReview: string[];
  transitions: { capabilityId: string; label: string; from: VisibleState; to: VisibleState }[];
  insufficientNote: string | null;
  next: { recommendationId: string; title: string; reason: string; minutes: number; subjectName: string } | null;
  launchId: string | null;
};

/** POST /v1/runtime/sessions/{id}/complete — cierra la sesión y corre la cadena de evidencia. */
export async function completeSession(db: DB, studentId: string, sessionId: string, opts: { refreshTeacher?: boolean; now?: Date } = {}) {
  const { session, def } = await loadOwnSession(db, studentId, sessionId);
  if (session.status === "completed") return session.result as SessionFeedback;
  const d = def.definition;
  const answered = Object.keys(session.state.answers).length;
  if (answered < d.completionRule.minimumOpportunitiesAttempted) throw new DomainError("VALIDATION", "Faltan situaciones por responder.");
  const now = opts.now ?? new Date();

  // La recomendación que originó la sesión (o la actividad docente) queda completada.
  const active = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.targetActor, "student"), eq(recommendations.targetScopeId, studentId), eq(recommendations.courseSectionId, session.courseSectionId), inArray(recommendations.status, ["generated", "surfaced", "started"])));
  for (const r of active) {
    if (r.id === session.recommendationId || (session.launchId && r.actionSpec.launchId === session.launchId)) await setRecommendationStatus(db, r.id, "completed");
  }

  await db.update(sourceArtifacts).set({ processingStatus: "ready" }).where(eq(sourceArtifacts.id, session.sourceArtifactId!));
  await db.update(experienceSessions).set({ status: "completed", completedAt: now, lastActivityAt: now }).where(eq(experienceSessions.id, session.id));
  await emit(db, { eventType: "experience.session_completed", aggregateType: "experience_session", aggregateId: session.id, courseSectionId: session.courseSectionId });

  const { changes } = await processStudentEvidence(db, {
    studentId,
    sectionId: session.courseSectionId,
    trigger: "experience_completed",
    sourceArtifactId: session.sourceArtifactId,
    refreshTeacher: opts.refreshTeacher,
    now,
  });

  const { capabilities } = await getCurriculum(db, session.courseSectionId);
  const capLabel = (id: string) => capabilities.find((c) => c.id === id)?.shortLabel ?? "";
  const before = ((session.result as { before?: Record<string, VisibleState> } | null)?.before ?? {}) as Record<string, VisibleState>;
  const afterRows = await db
    .select()
    .from(capabilityInterpretations)
    .where(and(eq(capabilityInterpretations.studentUserId, studentId), eq(capabilityInterpretations.courseSectionId, session.courseSectionId), inArray(capabilityInterpretations.capabilityId, d.targetCapabilityIds)));
  const transitions = d.targetCapabilityIds.map((id) => ({
    capabilityId: id,
    label: capLabel(id),
    from: before[id] ?? "unknown",
    to: afterRows.find((r) => r.capabilityId === id)?.visibleState ?? "unknown",
  }));
  const answers = Object.entries(session.state.answers);
  const correctCount = answers.filter(([, a]) => a.correct).length;
  const hintsUsed = Object.values(session.state.hintsByStep).reduce((s, n) => s + n, 0);
  const wrongErrors = new Map<string, number>();
  for (const [stepId, a] of answers) {
    if (a.correct) continue;
    const step = d.steps.find((s) => s.id === stepId);
    const opt = step?.options.find((o) => o.id === a.optionId);
    const label = capabilities.find((c) => c.id === step?.capabilityId)?.knownErrorTypes.find((e) => e.key === opt?.errorKey)?.label;
    if (label) wrongErrors.set(label, (wrongErrors.get(label) ?? 0) + 1);
  }
  const strengthened: string[] = [];
  if (correctCount > 0) strengthened.push(`Resolviste bien ${correctCount} de ${answers.length} situaciones de ${capLabel(d.targetCapabilityIds[0])}.`);
  for (const t of transitions) if (t.from !== t.to && (t.to === "solid" || (t.from === "needs_review" && t.to === "in_development")))
    strengthened.push(`${t.label}: pasó de “${VISIBLE_STATE_LABEL[t.from]}” a “${VISIBLE_STATE_LABEL[t.to]}”.`);
  const toReview = [...wrongErrors.entries()].map(([label, n]) => `${n === 1 ? "En una situación" : `En ${n} situaciones`} apareció: ${label.charAt(0).toLowerCase()}${label.slice(1)}.`);
  const stillReview = transitions.filter((t) => t.to === "needs_review");
  if (stillReview.length && toReview.length === 0) toReview.push("El error que veníamos observando todavía no se resolvió del todo: conviene una situación más.");
  const insufficientNote = transitions.some((t) => t.to === "unknown" || (t.to === "in_development" && t.from !== "needs_review"))
    ? "Ya tenemos una señal útil, pero todavía necesitamos verte aplicar esto en otra situación."
    : null;

  const home = await getStudentHome(db, studentId, now);
  const n = home.nextAction;
  const feedback: SessionFeedback = {
    before,
    correct: correctCount,
    total: answers.length,
    hintsUsed,
    strengthened,
    toReview,
    transitions,
    insufficientNote,
    next: n ? { recommendationId: n.id, title: n.title, reason: n.explanation.short, minutes: n.actionSpec.estimatedMinutes, subjectName: n.subjectName } : null,
    launchId: session.launchId,
  };
  await db.update(experienceSessions).set({ result: feedback }).where(eq(experienceSessions.id, session.id));
  void changes;
  return feedback;
}

// ── Vistas docentes del lanzamiento (agregadas) ─────────────────────────────

export async function getLaunchLive(db: DB, teacherId: string, launchId: string): Promise<LaunchLiveDTO> {
  const [row] = await db
    .select({ launch: launches, def: experienceDefinitions })
    .from(launches)
    .innerJoin(experienceDefinitions, eq(experienceDefinitions.id, launches.experienceDefinitionId))
    .where(eq(launches.id, launchId))
    .limit(1);
  if (!row) throw notFound("Lanzamiento");
  await assertTeacherOfSection(db, teacherId, row.launch.courseSectionId);
  const [{ enrolled }] = await db
    .select({ enrolled: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(and(eq(enrollments.courseSectionId, row.launch.courseSectionId), eq(enrollments.status, "active")));
  const sessions = await db
    .select({ id: experienceSessions.id, status: experienceSessions.status, state: experienceSessions.state, last: experienceSessions.lastActivityAt })
    .from(experienceSessions)
    .where(eq(experienceSessions.launchId, launchId));
  const recent = Date.now() - 3 * 60_000;
  const d = row.def.definition;
  return {
    launchId,
    status: row.launch.status,
    title: row.def.title,
    joinCode: row.launch.joinCode,
    enrolled: Number(enrolled),
    joined: sessions.length,
    active: sessions.filter((s) => s.status !== "completed" && s.last.getTime() >= recent).length,
    completed: sessions.filter((s) => s.status === "completed").length,
    steps: d.steps.map((step) => {
      const answers = sessions.map((s) => s.state.answers[step.id]).filter(Boolean);
      const total = answers.length;
      return {
        stepId: step.id,
        question: step.question,
        responses: total,
        // Distribución autorizada solo con n ≥ 5 (small-cell suppression).
        distribution:
          total >= K
            ? step.options.map((o) => {
                const c = answers.filter((a) => a!.optionId === o.id).length;
                return { optionId: o.id, text: o.text, correct: o.correct, count: c, pct: Math.round((c / total) * 100) };
              })
            : null,
      };
    }),
  };
}

export async function getLaunchResult(db: DB, teacherId: string, launchId: string): Promise<LaunchResultDTO> {
  const live = await getLaunchLive(db, teacherId, launchId);
  const [launch] = await db.select().from(launches).where(eq(launches.id, launchId)).limit(1);
  const [def] = await db.select().from(experienceDefinitions).where(eq(experienceDefinitions.id, launch.experienceDefinitionId)).limit(1);
  const capId = def.definition.targetCapabilityIds[0];
  const { capabilities } = await getCurriculum(db, launch.courseSectionId);
  const cap = capabilities.find((c) => c.id === capId)!;
  const base = (launch.baseline as Record<string, { numerator: number; denominator: number; enrolled: number; rate: number | null }>)[capId];
  const [proj] = await db
    .select()
    .from(classroomCapabilityProjection)
    .where(and(eq(classroomCapabilityProjection.courseSectionId, launch.courseSectionId), eq(classroomCapabilityProjection.capabilityId, capId)));
  const rate = (n: number, d: number) => (d >= K ? Math.round((n / d) * 100) : null);
  const hardest = live.steps
    .filter((s) => s.distribution)
    .map((s) => ({ question: s.question, correctPct: s.distribution!.find((o) => o.correct)?.pct ?? 0 }))
    .sort((a, b) => a.correctPct - b.correctPct)[0];
  const [topFinding] = await db
    .select()
    .from(teacherFindings)
    .where(and(eq(teacherFindings.courseSectionId, launch.courseSectionId), eq(teacherFindings.status, "active")))
    .orderBy(teacherFindings.priority)
    .limit(1);
  return {
    launchId,
    title: live.title,
    status: live.status,
    participants: live.joined,
    completed: live.completed,
    capability: { id: cap.id, label: cap.shortLabel },
    before: base
      ? { ratePct: rate(base.numerator, base.denominator), numerator: base.numerator, denominator: base.denominator, enrolled: base.enrolled }
      : { ratePct: null, numerator: 0, denominator: 0, enrolled: live.enrolled },
    after: proj
      ? { ratePct: rate(proj.needsReviewCount, proj.evidenceSufficientCount), numerator: proj.needsReviewCount, denominator: proj.evidenceSufficientCount, enrolled: proj.enrolledCount }
      : { ratePct: null, numerator: 0, denominator: 0, enrolled: live.enrolled },
    patterns: (proj?.confirmedErrorPatterns ?? [])
      .filter((e) => e.count >= K)
      .map((e) => ({ label: cap.knownErrorTypes.find((k) => k.key === e.key)?.label ?? e.key, count: e.count })),
    hardestStep: hardest ?? null,
    nextIntervention: topFinding ? { headline: topFinding.headline, findingId: topFinding.id, detail: topFinding.detail } : null,
  };
}

/** Lista de experiencias de la cátedra (docente). */
export async function listSectionExperiences(db: DB, teacherId: string, sectionId: string) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const defs = await db
    .select()
    .from(experienceDefinitions)
    .where(and(eq(experienceDefinitions.courseSectionId, sectionId), eq(experienceDefinitions.audience, "class_launch")))
    .orderBy(desc(experienceDefinitions.createdAt));
  const ls = defs.length ? await db.select().from(launches).where(inArray(launches.experienceDefinitionId, defs.map((d) => d.id))) : [];
  return defs.map((d) => ({ def: d, launches: ls.filter((l) => l.experienceDefinitionId === d.id) }));
}
