import { boolean, index, integer, jsonb, pgTable, real, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {
  AssistanceLevel,
  CognitiveLevel,
  ErrorType,
  EvidenceEventType,
  Performance,
  Polarity,
  ProcessingStatus,
  ProvenanceQuality,
  QualityBand,
  SourceType,
  ValidityStatus,
} from "@/modules/shared/enums";
import { createdAt, id, ts } from "./_shared";
import { courseSections, users } from "./identity";
import { capabilities } from "./curriculum";

// ── Profile (DM §6) — global del estudiante, nunca evidencia académica ──────
export const studentProfiles = pgTable("student_profiles", {
  studentUserId: uuid("student_user_id").primaryKey().references(() => users.id),
  currentProfileVersion: integer("current_profile_version").notNull().default(1),
  onboardingStatus: text("onboarding_status").$type<"not_started" | "in_progress" | "completed">().notNull(),
  personalizationEnabled: boolean("personalization_enabled").notNull().default(true),
});

export type ProfilePayload = {
  career?: string;
  stage?: string;
  works?: boolean;
  exposureAreas?: string[];
  interests?: string[];
  archetypes?: string[];
  professionalHypothesis?: string;
  openQuestions?: string[];
};

export const profileVersions = pgTable("profile_versions", {
  id: id(),
  studentUserId: uuid("student_user_id").notNull().references(() => users.id),
  versionNo: integer("version_no").notNull(),
  sourceType: text("source_type").$type<"onboarding" | "experience_update" | "manual_update">().notNull(),
  profilePayload: jsonb("profile_payload").$type<ProfilePayload>().notNull(),
  createdAt: createdAt(),
});

// ── Learning sources (DM §7) ────────────────────────────────────────────────
export const sourceArtifacts = pgTable(
  "source_artifacts",
  {
    id: id(),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    sourceType: text("source_type").$type<SourceType>().notNull(),
    title: text("title").notNull(),
    externalProvider: text("external_provider"),
    contentHash: text("content_hash"),
    /** Reemplazo simplificado del object storage para el MVP (texto original del upload). */
    rawContent: text("raw_content"),
    provenanceQuality: text("provenance_quality").$type<ProvenanceQuality>().notNull().default("direct"),
    processingStatus: text("processing_status").$type<ProcessingStatus>().notNull().default("ready"),
    parserVersion: text("parser_version"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sourceCreatedAt: ts("source_created_at").notNull().defaultNow(),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("source_artifacts_student_idx").on(t.studentUserId, t.courseSectionId, t.createdAt),
    index("source_artifacts_hash_idx").on(t.contentHash),
  ],
);

export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  sourceArtifactId: uuid("source_artifact_id").notNull().unique().references(() => sourceArtifacts.id),
  studentUserId: uuid("student_user_id").notNull().references(() => users.id),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  capabilityId: uuid("capability_id").references(() => capabilities.id),
  status: text("status").$type<"active" | "closed" | "deleted">().notNull().default("active"),
  createdAt: createdAt(),
});

export const aiMessages = pgTable("ai_messages", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id),
  sequenceNo: integer("sequence_no").notNull(),
  actor: text("actor").$type<"student" | "assistant" | "system">().notNull(),
  mode: text("mode").$type<"learning" | "evidence">().notNull().default("learning"),
  content: text("content").notNull(),
  modelName: text("model_name"),
  promptVersion: text("prompt_version"),
  assistanceMetadata: jsonb("assistance_metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const rawInteractions = pgTable(
  "raw_interactions",
  {
    id: id(),
    sourceArtifactId: uuid("source_artifact_id").notNull().references(() => sourceArtifacts.id),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    actor: text("actor").$type<"student" | "assistant" | "system">().notNull(),
    interactionType: text("interaction_type").notNull(),
    contentText: text("content_text"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    sequenceNo: integer("sequence_no").notNull().default(0),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
  },
  (t) => [index("raw_interactions_source_idx").on(t.sourceArtifactId)],
);

// ── Evidence (DM §8) ────────────────────────────────────────────────────────
export const opportunities = pgTable("opportunities", {
  id: id(),
  studentUserId: uuid("student_user_id").notNull().references(() => users.id),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  sourceArtifactId: uuid("source_artifact_id").notNull().references(() => sourceArtifacts.id),
  opportunityFamilyKey: text("opportunity_family_key").notNull(),
  targetCapabilityId: uuid("target_capability_id").notNull().references(() => capabilities.id),
  cognitiveDemand: text("cognitive_demand").$type<CognitiveLevel>().notNull(),
  attemptNo: integer("attempt_no").notNull().default(1),
  priorFeedbackReceived: boolean("prior_feedback_received").notNull().default(false),
  independenceGroupKey: text("independence_group_key").notNull(),
  createdAt: createdAt(),
});

export const evidenceEvents = pgTable(
  "evidence_events",
  {
    id: id(),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    sourceArtifactId: uuid("source_artifact_id").notNull().references(() => sourceArtifacts.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    rawInteractionIds: jsonb("raw_interaction_ids").$type<string[]>().notNull().default([]),
    eventType: text("event_type").$type<EvidenceEventType>().notNull(),
    taskContext: jsonb("task_context").$type<Record<string, unknown>>().notNull().default({}),
    studentAction: jsonb("student_action").$type<Record<string, unknown>>().notNull().default({}),
    cognitiveDemand: text("cognitive_demand").$type<CognitiveLevel>().notNull(),
    assistanceLevel: text("assistance_level").$type<AssistanceLevel>().notNull(),
    provenanceQuality: text("provenance_quality").$type<ProvenanceQuality>().notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    processorVersion: text("processor_version").notNull(),
    validityStatus: text("validity_status").$type<ValidityStatus>().notNull().default("valid"),
    occurredAt: ts("occurred_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("evidence_events_dedupe_uq").on(t.deduplicationKey)],
);

export const evidenceSignals = pgTable(
  "evidence_signals",
  {
    id: id(),
    evidenceEventId: uuid("evidence_event_id").notNull().references(() => evidenceEvents.id),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    opportunityId: uuid("opportunity_id").notNull(),
    independenceGroupKey: text("independence_group_key").notNull(),
    sourceArtifactId: uuid("source_artifact_id").notNull(),
    sourceType: text("source_type").$type<SourceType>().notNull(),
    performance: text("performance").$type<Performance>().notNull(),
    polarity: text("polarity").$type<Polarity>().notNull(),
    demonstratedLevel: text("demonstrated_level").$type<CognitiveLevel>().notNull(),
    taskCognitiveDemand: text("task_cognitive_demand").$type<CognitiveLevel>().notNull(),
    errorType: text("error_type").$type<ErrorType>(),
    normalizedErrorKey: text("normalized_error_key"),
    mappingConfidence: real("mapping_confidence").notNull(),
    evidenceQualityBand: text("evidence_quality_band").$type<QualityBand>().notNull(),
    assistanceLevel: text("assistance_level").$type<AssistanceLevel>().notNull(),
    provenanceQuality: text("provenance_quality").$type<ProvenanceQuality>().notNull(),
    stateEligible: boolean("state_eligible").notNull(),
    rationale: text("rationale").notNull(),
    /** Fragmento/paráfrasis de lo que hizo el estudiante; nunca se expone al docente sin anonimizar. */
    studentExcerpt: text("student_excerpt"),
    validityStatus: text("validity_status").$type<ValidityStatus>().notNull().default("valid"),
    processorVersion: text("processor_version").notNull(),
    occurredAt: ts("occurred_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("evidence_signals_scope_idx").on(t.studentUserId, t.courseSectionId, t.capabilityId)],
);

export const evidenceInvalidations = pgTable("evidence_invalidations", {
  id: id(),
  evidenceEventId: uuid("evidence_event_id").notNull().references(() => evidenceEvents.id),
  sourceArtifactId: uuid("source_artifact_id").notNull(),
  reasonCode: text("reason_code").notNull(),
  invalidatedBy: text("invalidated_by").$type<"user" | "system" | "operator" | "curriculum_change">().notNull(),
  createdAt: createdAt(),
});
