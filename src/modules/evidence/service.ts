import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  evidenceEvents,
  evidenceInvalidations,
  evidenceSignals,
  opportunities,
  sourceArtifacts,
} from "@/db/schema";
import type { AssistanceLevel, CognitiveLevel, EvidenceEventType, ProvenanceQuality, SourceType } from "@/modules/shared/enums";
import { ENGINE_PARAMS } from "@/modules/shared/params";
import type { InterpretationSignal } from "@/modules/interpretation/types";
import { classifyDecision, type SignalClassification } from "./engine";
import { emit } from "@/modules/shared/outbox";

/**
 * Evidence service: persiste la cadena Opportunity → EvidenceEvent → EvidenceSignal
 * conservando el lineage hacia SourceArtifact y RawInteraction (DM §24).
 */

export async function recordDecisionEvidence(
  db: DB,
  input: {
    studentId: string;
    sectionId: string;
    sourceArtifactId: string;
    sourceType: SourceType;
    rawInteractionId: string;
    sessionId: string;
    stepId: string;
    scenarioKey: string;
    capabilityId: string;
    cognitiveDemand: CognitiveLevel;
    optionId: string;
    optionText: string;
    correct: boolean;
    errorKey: string | null;
    errorLabel: string | null;
    hintsUsed: number;
    answerRevealed: boolean;
    occurredAt: Date;
    situation: string;
    question: string;
    rationaleOverride?: string;
  },
) {
  const family = `scenario:${input.scenarioKey}`;
  // Reintento del mismo ítem en otra sesión: ya vio el feedback → práctica, no oportunidad independiente.
  const [{ prior }] = await db
    .select({ prior: sql<number>`count(*)::int` })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.studentUserId, input.studentId),
        eq(opportunities.courseSectionId, input.sectionId),
        eq(opportunities.opportunityFamilyKey, family),
      ),
    );
  const attemptNo = Number(prior) + 1;
  const c = classifyDecision({
    correct: input.correct,
    errorKey: input.errorKey,
    cognitiveDemand: input.cognitiveDemand,
    hintsUsed: input.hintsUsed,
    answerRevealed: input.answerRevealed,
    attemptNo,
    priorFeedbackReceived: attemptNo > 1,
    optionText: input.optionText,
    errorLabel: input.errorLabel,
  });
  const independenceGroupKey = `${input.sessionId}:${input.stepId}`;
  const [opp] = await db
    .insert(opportunities)
    .values({
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      sourceArtifactId: input.sourceArtifactId,
      opportunityFamilyKey: family,
      targetCapabilityId: input.capabilityId,
      cognitiveDemand: input.cognitiveDemand,
      attemptNo,
      priorFeedbackReceived: attemptNo > 1,
      independenceGroupKey,
    })
    .returning();
  const [ev] = await db
    .insert(evidenceEvents)
    .values({
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      sourceArtifactId: input.sourceArtifactId,
      opportunityId: opp.id,
      rawInteractionIds: [input.rawInteractionId],
      eventType: "decision",
      taskContext: { situation: input.situation, question: input.question, scenarioKey: input.scenarioKey },
      studentAction: { optionId: input.optionId, optionText: input.optionText },
      cognitiveDemand: input.cognitiveDemand,
      assistanceLevel: c.assistance,
      provenanceQuality: "direct",
      deduplicationKey: `rt:${input.sessionId}:${input.stepId}`,
      processorVersion: ENGINE_PARAMS.evidenceProcessorVersion,
      occurredAt: input.occurredAt,
    })
    .onConflictDoNothing()
    .returning();
  if (!ev) return null; // ya procesado (idempotencia)
  const [signal] = await db
    .insert(evidenceSignals)
    .values({
      evidenceEventId: ev.id,
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      capabilityId: input.capabilityId,
      opportunityId: opp.id,
      independenceGroupKey,
      sourceArtifactId: input.sourceArtifactId,
      sourceType: input.sourceType,
      performance: c.performance,
      polarity: c.polarity,
      demonstratedLevel: c.demonstratedLevel,
      taskCognitiveDemand: input.cognitiveDemand,
      errorType: c.errorType,
      normalizedErrorKey: c.normalizedErrorKey,
      mappingConfidence: 1,
      evidenceQualityBand: c.qualityBand,
      assistanceLevel: c.assistance,
      provenanceQuality: "direct",
      stateEligible: c.stateEligible,
      rationale: input.rationaleOverride ?? c.rationale,
      studentExcerpt: input.optionText,
      processorVersion: ENGINE_PARAMS.evidenceProcessorVersion,
      occurredAt: input.occurredAt,
    })
    .returning();
  return { signal, classification: c, attemptNo };
}

export async function recordSemanticEvidence(
  db: DB,
  input: {
    studentId: string;
    sectionId: string;
    sourceArtifactId: string;
    sourceType: SourceType;
    rawInteractionIds: string[];
    capabilityId: string;
    eventType: EvidenceEventType;
    taskDemand: CognitiveLevel;
    classification: SignalClassification;
    mappingConfidence: number;
    assistance: AssistanceLevel;
    provenance: ProvenanceQuality;
    familyKey: string;
    dedupeKey: string;
    occurredAt: Date;
    excerpt: string | null;
    taskContext: Record<string, unknown>;
  },
) {
  const independenceGroupKey = `${input.sourceArtifactId}:${input.familyKey}`;
  const [opp] = await db
    .insert(opportunities)
    .values({
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      sourceArtifactId: input.sourceArtifactId,
      opportunityFamilyKey: input.familyKey,
      targetCapabilityId: input.capabilityId,
      cognitiveDemand: input.taskDemand,
      independenceGroupKey,
    })
    .returning();
  const [ev] = await db
    .insert(evidenceEvents)
    .values({
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      sourceArtifactId: input.sourceArtifactId,
      opportunityId: opp.id,
      rawInteractionIds: input.rawInteractionIds,
      eventType: input.eventType,
      taskContext: input.taskContext,
      studentAction: { excerpt: input.excerpt },
      cognitiveDemand: input.taskDemand,
      assistanceLevel: input.assistance,
      provenanceQuality: input.provenance,
      deduplicationKey: input.dedupeKey,
      processorVersion: ENGINE_PARAMS.evidenceProcessorVersion,
      occurredAt: input.occurredAt,
    })
    .onConflictDoNothing()
    .returning();
  if (!ev) return null;
  const c = input.classification;
  const [signal] = await db
    .insert(evidenceSignals)
    .values({
      evidenceEventId: ev.id,
      studentUserId: input.studentId,
      courseSectionId: input.sectionId,
      capabilityId: input.capabilityId,
      opportunityId: opp.id,
      independenceGroupKey,
      sourceArtifactId: input.sourceArtifactId,
      sourceType: input.sourceType,
      performance: c.performance,
      polarity: c.polarity,
      demonstratedLevel: c.demonstratedLevel,
      taskCognitiveDemand: input.taskDemand,
      errorType: c.errorType,
      normalizedErrorKey: c.normalizedErrorKey,
      mappingConfidence: input.mappingConfidence,
      evidenceQualityBand: c.qualityBand,
      assistanceLevel: input.assistance,
      provenanceQuality: input.provenance,
      stateEligible: c.stateEligible,
      rationale: c.rationale,
      studentExcerpt: input.excerpt,
      processorVersion: ENGINE_PARAMS.evidenceProcessorVersion,
      occurredAt: input.occurredAt,
    })
    .returning();
  return { signal };
}

/** Fuente eliminada → evidencia derivada inválida (DM §25.1). Devuelve el alcance a recalcular. */
export async function invalidateSource(db: DB, sourceArtifactId: string, by: "user" | "system" | "operator") {
  const [src] = await db.select().from(sourceArtifacts).where(eq(sourceArtifacts.id, sourceArtifactId)).limit(1);
  if (!src) return null;
  await db
    .update(sourceArtifacts)
    .set({ processingStatus: "deleted", deletedAt: new Date(), rawContent: null })
    .where(eq(sourceArtifacts.id, sourceArtifactId));
  const events = await db.select({ id: evidenceEvents.id }).from(evidenceEvents).where(eq(evidenceEvents.sourceArtifactId, sourceArtifactId));
  const eventIds = events.map((e) => e.id);
  let capabilityIds: string[] = [];
  if (eventIds.length) {
    await db.update(evidenceEvents).set({ validityStatus: "invalid" }).where(inArray(evidenceEvents.id, eventIds));
    const sigs = await db
      .update(evidenceSignals)
      .set({ validityStatus: "invalid", studentExcerpt: null })
      .where(inArray(evidenceSignals.evidenceEventId, eventIds))
      .returning({ capabilityId: evidenceSignals.capabilityId });
    capabilityIds = [...new Set(sigs.map((s) => s.capabilityId))];
    await db.insert(evidenceInvalidations).values(
      eventIds.map((id) => ({ evidenceEventId: id, sourceArtifactId, reasonCode: "SOURCE_DELETED", invalidatedBy: by })),
    );
  }
  await emit(db, {
    eventType: "learning.source_deleted",
    aggregateType: "source_artifact",
    aggregateId: sourceArtifactId,
    courseSectionId: src.courseSectionId,
    payload: { invalidated_events: eventIds.length },
  });
  return { studentId: src.studentUserId, sectionId: src.courseSectionId, capabilityIds };
}

export async function loadSignals(db: DB, studentId: string, sectionId: string): Promise<InterpretationSignal[]> {
  const rows = await db
    .select()
    .from(evidenceSignals)
    .where(and(eq(evidenceSignals.studentUserId, studentId), eq(evidenceSignals.courseSectionId, sectionId)));
  return rows.map((s) => ({
    id: s.id,
    capabilityId: s.capabilityId,
    opportunityId: s.opportunityId,
    independenceGroupKey: s.independenceGroupKey,
    sourceArtifactId: s.sourceArtifactId,
    sourceType: s.sourceType,
    performance: s.performance,
    polarity: s.polarity,
    demonstratedLevel: s.demonstratedLevel,
    taskCognitiveDemand: s.taskCognitiveDemand,
    normalizedErrorKey: s.normalizedErrorKey,
    mappingConfidence: s.mappingConfidence,
    qualityBand: s.evidenceQualityBand,
    assistanceLevel: s.assistanceLevel,
    stateEligible: s.stateEligible,
    valid: s.validityStatus === "valid",
    occurredAt: s.occurredAt,
  }));
}
