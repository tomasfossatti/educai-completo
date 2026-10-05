/**
 * Enums canónicos tomados de Data_Model_Database_Schema_v1.0 y de las specs de motores.
 * Se persisten como `text` (DM:72 permite `text + check`) y se tipan acá.
 */

export const COGNITIVE_LEVELS = ["recognize", "explain", "apply", "solve", "transfer"] as const;
export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];
export const levelRank = (l: CognitiveLevel): number => COGNITIVE_LEVELS.indexOf(l);

export const SOURCE_TYPES = [
  "educai_ai_chat",
  "external_ai_transcript",
  "interactive_experience",
  "structured_activity",
  "exit_ticket",
  "project_artifact",
  "student_explanation",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type ProvenanceQuality = "direct" | "user_uploaded" | "self_reported";
export type ProcessingStatus =
  | "pending"
  | "needs_confirmation"
  | "processing"
  | "ready"
  | "failed"
  | "invalidated"
  | "deleted";

export const ASSISTANCE_LEVELS = [
  "none",
  "light_prompting",
  "scaffolded",
  "substantial",
  "answer_revealed",
  "unknown",
] as const;
export type AssistanceLevel = (typeof ASSISTANCE_LEVELS)[number];

export type EvidenceEventType =
  | "answer"
  | "explanation"
  | "decision"
  | "classification"
  | "calculation"
  | "artifact"
  | "revision"
  | "application"
  | "reflection";

export type Performance = "correct" | "partially_correct" | "incorrect" | "indeterminate";
export type Polarity = "supports" | "challenges" | "neutral";
export type QualityBand = "HIGH" | "MEDIUM" | "LOW" | "INELIGIBLE";
export type ErrorType =
  | "misconception"
  | "procedural_error"
  | "incomplete_reasoning"
  | "application_failure"
  | "transfer_failure"
  | "calculation_error"
  | "attention_error"
  | "unknown";
export type ValidityStatus = "valid" | "invalid" | "superseded";

export type MaturityState = "unknown" | "developing" | "solid";
export type AttentionState = "none" | "review";
export type VisibleState = "unknown" | "in_development" | "solid" | "needs_review";
export type EvidenceSufficiency = "none" | "limited" | "sufficient" | "robust";
export type InterpretationConfidence = "low" | "medium" | "high";
export type ErrorPatternStatus = "candidate" | "confirmed" | "resolved";

export type NextEvidenceNeedType =
  | "more_evidence"
  | "independent_attempt"
  | "unassisted_attempt"
  | "higher_cognitive_level"
  | "new_context"
  | "error_retest"
  | "transfer_opportunity"
  | "contradiction_resolution"
  | "no_additional_evidence_needed";

export type Importance = "low" | "medium" | "high" | "critical";

export type RecommendationStatus =
  | "generated"
  | "surfaced"
  | "started"
  | "completed"
  | "dismissed"
  | "disagreed"
  | "expired"
  | "superseded"
  | "invalidated";

export type StudentMode =
  | "resume"
  | "learn"
  | "remediate"
  | "practice"
  | "verify"
  | "advance"
  | "transfer"
  | "assessment_review";

export type StudentActionType =
  | "resume_session"
  | "complete_teacher_action"
  | "guided_explanation"
  | "contrastive_example"
  | "diagnostic_probe"
  | "independent_attempt"
  | "error_focused_practice"
  | "application_challenge"
  | "contradiction_probe"
  | "transfer_challenge"
  | "advance_to_next_capability"
  | "ai_tutoring_session";

export type ExperienceStatus =
  | "draft"
  | "generating"
  | "validating"
  | "preview_ready"
  | "ready"
  | "published"
  | "retired"
  | "generation_failed"
  | "validation_failed"
  | "invalidated";

export type SessionStatus =
  | "created"
  | "active"
  | "paused"
  | "completed"
  | "abandoned"
  | "expired"
  | "failed"
  | "invalidated";

export type LaunchStatus = "scheduled" | "open" | "closed" | "cancelled";
