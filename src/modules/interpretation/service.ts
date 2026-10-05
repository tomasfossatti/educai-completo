import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { capabilityInterpretations, errorPatterns, interpretationHistory } from "@/db/schema";
import type { MaturityState, VisibleState } from "@/modules/shared/enums";
import { getCurriculum } from "@/modules/curriculum/service";
import { loadSignals } from "@/modules/evidence/service";
import { emit } from "@/modules/shared/outbox";
import { eligibleSignals, interpretCapability } from "./engine";

export type StateChange = { capabilityId: string; from: VisibleState | null; to: VisibleState };

const MATURITY_RANK: Record<MaturityState, number> = { unknown: 0, developing: 1, solid: 2 };

/**
 * Recalcula interpretaciones de un estudiante dentro de UNA cátedra.
 * Nunca lee evidencia de otra cátedra: la carga de señales filtra por (student, course_section).
 * Idempotente por input_hash + engine_version (EDU-0509).
 */
export async function recomputeInterpretations(
  db: DB,
  studentId: string,
  sectionId: string,
  opts: { trigger: string; sourceArtifactId?: string | null; now?: Date } = { trigger: "recompute" },
): Promise<StateChange[]> {
  const now = opts.now ?? new Date();
  const { capabilities } = await getCurriculum(db, sectionId);
  const signals = await loadSignals(db, studentId, sectionId);
  const existing = await db
    .select()
    .from(capabilityInterpretations)
    .where(and(eq(capabilityInterpretations.studentUserId, studentId), eq(capabilityInterpretations.courseSectionId, sectionId)));
  const existingByCap = new Map(existing.map((e) => [e.capabilityId, e]));
  const changes: StateChange[] = [];
  const visibleByCap = new Map<string, VisibleState>();
  const computed: { capId: string; prereqIds: string[] }[] = [];

  for (const cap of capabilities) {
    const capSignals = signals.filter((s) => s.capabilityId === cap.id);
    const prev = existingByCap.get(cap.id);
    if (capSignals.length === 0 && !prev) {
      visibleByCap.set(cap.id, "unknown");
      continue; // sin evidencia ni estado previo: "Todavía no sabemos" implícito, sin fila.
    }
    const result = interpretCapability({ id: cap.id, targetLevel: cap.targetCognitiveLevel }, capSignals, now);
    visibleByCap.set(cap.id, result.visibleState);
    computed.push({ capId: cap.id, prereqIds: cap.prerequisiteIds });
    const inputHash = createHash("sha256")
      .update(JSON.stringify([result.engineVersion, eligibleSignals(capSignals).map((s) => s.id).sort()]))
      .digest("hex")
      .slice(0, 24);
    if (prev && prev.inputHash === inputHash && prev.engineVersion === result.engineVersion) continue;

    const peak: MaturityState =
      prev && MATURITY_RANK[prev.historicalPeakState] > MATURITY_RANK[result.maturityState] ? prev.historicalPeakState : result.maturityState;
    const values = {
      studentUserId: studentId,
      courseSectionId: sectionId,
      capabilityId: cap.id,
      visibleState: result.visibleState,
      maturityState: result.maturityState,
      attentionState: result.attentionState,
      evidenceSufficiency: result.evidenceSufficiency,
      interpretationConfidence: result.interpretationConfidence,
      highestReliablyDemonstratedLevel: result.highestReliablyDemonstratedLevel,
      historicalPeakState: peak,
      supportingOpportunityIds: result.supportingOpportunityIds,
      challengingOpportunityIds: result.challengingOpportunityIds,
      unresolvedErrorKeys: result.rationale.unresolvedErrorPatternKeys,
      contradictions: result.contradictions,
      nextEvidenceNeed: result.nextEvidenceNeed,
      rationale: result.rationale,
      eligibleOpportunityCount: result.eligibleOpportunityCount,
      inputHash,
      engineVersion: result.engineVersion,
      computedAt: now,
    };
    await db
      .insert(capabilityInterpretations)
      .values(values)
      .onConflictDoUpdate({
        target: [capabilityInterpretations.studentUserId, capabilityInterpretations.courseSectionId, capabilityInterpretations.capabilityId],
        set: values,
      });

    for (const p of result.errorPatterns) {
      const v = {
        studentUserId: studentId,
        courseSectionId: sectionId,
        capabilityId: cap.id,
        normalizedErrorType: p.key,
        status: p.status,
        confirmationRule: p.rule ?? null,
        supportingSignalIds: p.signalIds,
        firstSeenAt: new Date(p.firstSeenAt),
        lastSeenAt: new Date(p.lastSeenAt),
        resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
        updatedAt: now,
      };
      await db
        .insert(errorPatterns)
        .values(v)
        .onConflictDoUpdate({
          target: [errorPatterns.studentUserId, errorPatterns.courseSectionId, errorPatterns.capabilityId, errorPatterns.normalizedErrorType],
          set: v,
        });
    }

    const from = prev?.visibleState ?? null;
    if (from !== result.visibleState) {
      changes.push({ capabilityId: cap.id, from, to: result.visibleState });
      await db.insert(interpretationHistory).values({
        studentUserId: studentId,
        courseSectionId: sectionId,
        capabilityId: cap.id,
        fromVisibleState: from,
        toVisibleState: result.visibleState,
        triggerReason: opts.trigger,
        triggeringSourceArtifactId: opts.sourceArtifactId ?? null,
        snapshot: { ...result, computedAt: now.toISOString() } as unknown as Record<string, unknown>,
        engineVersion: result.engineVersion,
        createdAt: now,
      });
      await emit(db, {
        eventType: "interpretation.updated",
        aggregateType: "capability_interpretation",
        aggregateId: `${studentId}:${cap.id}`,
        courseSectionId: sectionId,
        payload: { capability_id: cap.id, from, to: result.visibleState, trigger: opts.trigger },
      });
    }
  }

  // prerequisite_risk (I:963-989): B conserva su estado; solo se marca el riesgo.
  for (const c of computed) {
    const atRisk = c.prereqIds.filter((p) => visibleByCap.get(p) === "needs_review");
    await db
      .update(capabilityInterpretations)
      .set({ prerequisiteRisk: { atRisk: atRisk.length > 0, prerequisiteCapabilityIds: atRisk } })
      .where(
        and(
          eq(capabilityInterpretations.studentUserId, studentId),
          eq(capabilityInterpretations.courseSectionId, sectionId),
          eq(capabilityInterpretations.capabilityId, c.capId),
        ),
      );
  }
  return changes;
}

export async function getInterpretations(db: DB, studentId: string, sectionId: string) {
  return db
    .select()
    .from(capabilityInterpretations)
    .where(and(eq(capabilityInterpretations.studentUserId, studentId), eq(capabilityInterpretations.courseSectionId, sectionId)));
}
