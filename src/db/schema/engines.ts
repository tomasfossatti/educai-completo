import { boolean, index, integer, jsonb, pgTable, real, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {
  AttentionState,
  CognitiveLevel,
  ErrorPatternStatus,
  EvidenceSufficiency,
  ExperienceStatus,
  InterpretationConfidence,
  LaunchStatus,
  MaturityState,
  RecommendationStatus,
  SessionStatus,
  VisibleState,
} from "@/modules/shared/enums";
import type {
  ContradictionResult,
  InterpretationRationale,
  NextEvidenceNeed,
} from "@/modules/interpretation/types";
import type { ActionSpec, RecommendationExplanation } from "@/modules/recommendation/types";
import type { DecisionScenarioDefinition } from "@/modules/experience/contract";
import { createdAt, id, ts, updatedAt } from "./_shared";
import { classSessions, courseSections, users } from "./identity";
import { capabilities } from "./curriculum";
import { sourceArtifacts } from "./learning";

// ── Interpretation (DM §9) ──────────────────────────────────────────────────
export const capabilityInterpretations = pgTable(
  "capability_interpretations",
  {
    id: id(),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    visibleState: text("visible_state").$type<VisibleState>().notNull(),
    maturityState: text("maturity_state").$type<MaturityState>().notNull(),
    attentionState: text("attention_state").$type<AttentionState>().notNull(),
    evidenceSufficiency: text("evidence_sufficiency").$type<EvidenceSufficiency>().notNull(),
    interpretationConfidence: text("interpretation_confidence").$type<InterpretationConfidence>().notNull(),
    highestReliablyDemonstratedLevel: text("highest_reliably_demonstrated_level").$type<CognitiveLevel>(),
    historicalPeakState: text("historical_peak_state").$type<MaturityState>().notNull().default("unknown"),
    supportingOpportunityIds: jsonb("supporting_opportunity_ids").$type<string[]>().notNull().default([]),
    challengingOpportunityIds: jsonb("challenging_opportunity_ids").$type<string[]>().notNull().default([]),
    unresolvedErrorKeys: jsonb("unresolved_error_keys").$type<string[]>().notNull().default([]),
    contradictions: jsonb("contradictions").$type<ContradictionResult[]>().notNull().default([]),
    nextEvidenceNeed: jsonb("next_evidence_need").$type<NextEvidenceNeed>().notNull(),
    prerequisiteRisk: jsonb("prerequisite_risk").$type<{ atRisk: boolean; prerequisiteCapabilityIds: string[] }>().notNull().default({ atRisk: false, prerequisiteCapabilityIds: [] }),
    rationale: jsonb("rationale").$type<InterpretationRationale>().notNull(),
    eligibleOpportunityCount: integer("eligible_opportunity_count").notNull().default(0),
    inputHash: text("input_hash").notNull(),
    engineVersion: text("engine_version").notNull(),
    computedAt: ts("computed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("capability_interpretations_uq").on(t.studentUserId, t.courseSectionId, t.capabilityId)],
);

export const interpretationHistory = pgTable(
  "interpretation_history",
  {
    id: id(),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    fromVisibleState: text("from_visible_state").$type<VisibleState>(),
    toVisibleState: text("to_visible_state").$type<VisibleState>().notNull(),
    triggerReason: text("trigger_reason").notNull(),
    triggeringSourceArtifactId: uuid("triggering_source_artifact_id"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    engineVersion: text("engine_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("interpretation_history_scope_idx").on(t.studentUserId, t.courseSectionId, t.capabilityId)],
);

export const errorPatterns = pgTable(
  "error_patterns",
  {
    id: id(),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    normalizedErrorType: text("normalized_error_type").notNull(),
    status: text("status").$type<ErrorPatternStatus>().notNull(),
    confirmationRule: text("confirmation_rule"),
    supportingSignalIds: jsonb("supporting_signal_ids").$type<string[]>().notNull().default([]),
    firstSeenAt: ts("first_seen_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull(),
    resolvedAt: ts("resolved_at"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("error_patterns_uq").on(t.studentUserId, t.courseSectionId, t.capabilityId, t.normalizedErrorType)],
);

// ── Recommendation (DM §10) ─────────────────────────────────────────────────
export const recommendations = pgTable(
  "recommendations",
  {
    id: id(),
    targetActor: text("target_actor").$type<"student" | "teacher">().notNull(),
    /** student_user_id o course_section_id según target_actor. */
    targetScopeId: uuid("target_scope_id").notNull(),
    courseSectionId: uuid("course_section_id").references(() => courseSections.id),
    domain: text("domain").notNull(),
    mode: text("mode").notNull(),
    priorityClass: text("priority_class").notNull(),
    priorityBand: text("priority_band").$type<"low" | "normal" | "high" | "urgent">().notNull(),
    /** Posición dentro de la cátedra: 1 = próxima acción de la sección; 2-3 = otros pendientes. */
    rank: integer("rank").notNull().default(1),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull().default([]),
    actionSpec: jsonb("action_spec").$type<ActionSpec>().notNull(),
    explanation: jsonb("explanation").$type<RecommendationExplanation>().notNull(),
    status: text("status").$type<RecommendationStatus>().notNull().default("generated"),
    contextHash: text("context_hash").notNull(),
    supersededById: uuid("superseded_by_id"),
    supersessionReason: text("supersession_reason"),
    dueAt: ts("due_at"),
    engineVersion: text("engine_version").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("recommendations_target_idx").on(t.targetActor, t.targetScopeId, t.status)],
);

export const recommendationCapabilities = pgTable(
  "recommendation_capabilities",
  {
    recommendationId: uuid("recommendation_id").notNull().references(() => recommendations.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
  },
  (t) => [uniqueIndex("recommendation_capabilities_uq").on(t.recommendationId, t.capabilityId)],
);

export const recommendationSources = pgTable("recommendation_sources", {
  id: id(),
  recommendationId: uuid("recommendation_id").notNull().references(() => recommendations.id),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  reasonCode: text("reason_code").notNull(),
});

export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: id(),
  recommendationId: uuid("recommendation_id").notNull().references(() => recommendations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  feedbackType: text("feedback_type").$type<"makes_sense" | "disagree" | "dismiss">().notNull(),
  reasonCode: text("reason_code"),
  comment: text("comment"),
  createdAt: createdAt(),
});

export const recommendationHistory = pgTable("recommendation_history", {
  id: id(),
  recommendationId: uuid("recommendation_id").notNull().references(() => recommendations.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  createdAt: createdAt(),
});

// ── Experience (DM §11) ─────────────────────────────────────────────────────
export const experienceSpecs = pgTable("experience_specs", {
  id: id(),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  recommendationId: uuid("recommendation_id"),
  findingId: uuid("finding_id"),
  objective: text("objective").notNull(),
  targetCapabilityIds: jsonb("target_capability_ids").$type<string[]>().notNull(),
  targetCognitiveLevel: text("target_cognitive_level").$type<CognitiveLevel>().notNull(),
  deliveryMode: text("delivery_mode").notNull().default("interactive_web"),
  participationScope: text("participation_scope").$type<"individual" | "whole_class">().notNull().default("individual"),
  pedagogicalPattern: text("pedagogical_pattern").notNull(),
  targetErrorKeys: jsonb("target_error_keys").$type<string[]>().notNull().default([]),
  teacherInstruction: text("teacher_instruction"),
  plannerVersion: text("planner_version").notNull(),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: createdAt(),
});

export type QualityReview = {
  overall: "pass" | "warn" | "fail";
  checks: { dimension: string; result: "pass" | "warn" | "fail"; message: string }[];
};

export const experienceDefinitions = pgTable(
  "experience_definitions",
  {
    id: id(),
    experienceSpecId: uuid("experience_spec_id").notNull().references(() => experienceSpecs.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    experienceKey: text("experience_key").notNull(),
    version: text("version").notNull(),
    title: text("title").notNull(),
    audience: text("audience").$type<"class_launch" | "individual_practice">().notNull(),
    runtimeAdapter: text("runtime_adapter").notNull().default("declarative_decision_v1"),
    generationSource: text("generation_source").$type<"llm" | "bank" | "seed">().notNull(),
    definition: jsonb("definition").$type<DecisionScenarioDefinition>().notNull(),
    qualityReview: jsonb("quality_review").$type<QualityReview>().notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").$type<ExperienceStatus>().notNull(),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("experience_definitions_key_uq").on(t.experienceKey, t.version)],
);

export const launches = pgTable("launches", {
  id: id(),
  experienceDefinitionId: uuid("experience_definition_id").notNull().references(() => experienceDefinitions.id),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  classSessionId: uuid("class_session_id").references(() => classSessions.id),
  status: text("status").$type<LaunchStatus>().notNull(),
  joinCode: text("join_code").notNull().unique(),
  opensAt: ts("opens_at").notNull().defaultNow(),
  closesAt: ts("closes_at"),
  /** Snapshot agregado de la proyección antes de lanzar, para el "antes/después" (T-64). */
  baseline: jsonb("baseline").$type<Record<string, unknown>>().notNull().default({}),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: createdAt(),
});

export type SessionState = {
  answers: Record<string, { optionId: string; correct: boolean; attemptNo: number; hintsUsed: number }>;
  hintsByStep: Record<string, number>;
  revealedSteps: string[];
};

export const experienceSessions = pgTable(
  "experience_sessions",
  {
    id: id(),
    launchId: uuid("launch_id").references(() => launches.id),
    experienceDefinitionId: uuid("experience_definition_id").notNull().references(() => experienceDefinitions.id),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    recommendationId: uuid("recommendation_id"),
    sourceArtifactId: uuid("source_artifact_id").references(() => sourceArtifacts.id),
    status: text("status").$type<SessionStatus>().notNull().default("created"),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    lastSequenceNo: integer("last_sequence_no").notNull().default(-1),
    state: jsonb("state").$type<SessionState>().notNull().default({ answers: {}, hintsByStep: {}, revealedSteps: [] }),
    result: jsonb("result").$type<Record<string, unknown>>(),
    isSimulated: boolean("is_simulated").notNull().default(false),
    startedAt: ts("started_at"),
    lastActivityAt: ts("last_activity_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("experience_sessions_student_idx").on(t.studentUserId, t.status)],
);

export const runtimeEvents = pgTable(
  "runtime_events",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => experienceSessions.id),
    idempotencyKey: text("idempotency_key").notNull(),
    eventType: text("event_type").notNull(),
    stepId: text("step_id"),
    opportunityId: text("opportunity_id"),
    sequenceNo: integer("sequence_no").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    schemaVersion: text("schema_version").notNull(),
    sdkVersion: text("sdk_version").notNull(),
    occurredAt: ts("occurred_at").notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("runtime_events_idem_uq").on(t.sessionId, t.idempotencyKey),
    uniqueIndex("runtime_events_seq_uq").on(t.sessionId, t.sequenceNo),
  ],
);

// ── Teacher projections (DM §13) — sin student_user_id ──────────────────────
export type ErrorPatternCount = { key: string; count: number };

export const classroomCapabilityProjection = pgTable(
  "classroom_capability_projection",
  {
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    enrolledCount: integer("enrolled_count").notNull(),
    evidenceSufficientCount: integer("evidence_sufficient_count").notNull(),
    withAnyEvidenceCount: integer("with_any_evidence_count").notNull(),
    unknownCount: integer("unknown_count").notNull(),
    developingCount: integer("developing_count").notNull(),
    solidCount: integer("solid_count").notNull(),
    needsReviewCount: integer("needs_review_count").notNull(),
    needsReviewRate: real("needs_review_rate"),
    evidenceCoverage: real("evidence_coverage").notNull(),
    confirmedErrorPatterns: jsonb("confirmed_error_patterns").$type<ErrorPatternCount[]>().notNull().default([]),
    /** Estudiantes (contados) con explicar sólido y aplicar en revisión. */
    cognitiveGapCount: integer("cognitive_gap_count").notNull().default(0),
    contradictionCount: integer("contradiction_count").notNull().default(0),
    sourceTypeCounts: jsonb("source_type_counts").$type<Record<string, number>>().notNull().default({}),
    trend: text("trend").$type<"improving" | "stable" | "worsening" | "unknown">().notNull().default("unknown"),
    projectionVersion: integer("projection_version").notNull().default(1),
    computedAt: ts("computed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("classroom_capability_projection_pk").on(t.courseSectionId, t.capabilityId)],
);

export const classroomCapabilitySnapshots = pgTable("classroom_capability_snapshots", {
  id: id(),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
  label: text("label").notNull(),
  evidenceSufficientCount: integer("evidence_sufficient_count").notNull(),
  needsReviewCount: integer("needs_review_count").notNull(),
  solidCount: integer("solid_count").notNull(),
  enrolledCount: integer("enrolled_count").notNull(),
  capturedAt: ts("captured_at").notNull().defaultNow(),
});

export type FindingRationale = {
  reasonCodes: string[];
  rate: number | null;
  numerator: number;
  denominator: number;
  enrolled: number;
  dominantErrorKey: string | null;
  cognitiveGapCount: number;
  assessmentInDays: number | null;
  prerequisiteOf: string[];
  score: number;
};

export const teacherFindings = pgTable(
  "teacher_findings",
  {
    id: id(),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    findingType: text("finding_type").$type<"needs_review" | "low_coverage" | "cognitive_gap">().notNull(),
    headline: text("headline").notNull(),
    detail: text("detail").notNull(),
    rationale: jsonb("rationale").$type<FindingRationale>().notNull(),
    priority: integer("priority").notNull(),
    status: text("status").$type<"active" | "resolved" | "superseded">().notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("teacher_findings_uq").on(t.courseSectionId, t.capabilityId, t.findingType)],
);

export const teacherFindingValidations = pgTable("teacher_finding_validations", {
  id: id(),
  findingId: uuid("finding_id").notNull().references(() => teacherFindings.id),
  teacherUserId: uuid("teacher_user_id").notNull().references(() => users.id),
  validation: text("validation").$type<"agree" | "partially_agree" | "disagree" | "not_sure">().notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
});

export const classFeedbackSummaries = pgTable("class_feedback_summaries", {
  id: id(),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  classSessionId: uuid("class_session_id").references(() => classSessions.id),
  respondentCount: integer("respondent_count").notNull(),
  worked: text("worked").notNull(),
  mainOpportunity: text("main_opportunity").notNull(),
  otherPatterns: jsonb("other_patterns").$type<string[]>().notNull().default([]),
  tryNext: text("try_next").notNull(),
  smallCellSuppressed: boolean("small_cell_suppressed").notNull().default(false),
  createdAt: createdAt(),
});

// ── Audit / analytics / AI telemetry (DM §14-16) ────────────────────────────
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    courseSectionId: uuid("course_section_id"),
    correlationId: text("correlation_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    publishedAt: ts("published_at"),
  },
  (t) => [index("outbox_events_created_idx").on(t.occurredAt)],
);

export const productAnalyticsEvents = pgTable("product_analytics_events", {
  id: id(),
  eventName: text("event_name").notNull(),
  userId: uuid("user_id"),
  courseSectionId: uuid("course_section_id"),
  properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: ts("occurred_at").notNull().defaultNow(),
});

export const aiCalls = pgTable("ai_calls", {
  id: id(),
  task: text("task").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model"),
  status: text("status").$type<"ok" | "invalid_output" | "error" | "fallback">().notNull(),
  fallbackUsed: boolean("fallback_used").notNull().default(false),
  latencyMs: integer("latency_ms").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsdEstimate: real("cost_usd_estimate").notNull().default(0),
  error: text("error"),
  courseSectionId: uuid("course_section_id"),
  createdAt: createdAt(),
});
