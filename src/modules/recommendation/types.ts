import type { CognitiveLevel, StudentActionType, StudentMode } from "@/modules/shared/enums";

export type StudentReasonCode =
  | "TEACHER_REQUIRED"
  | "RESUME_RECENT_SESSION"
  | "ASSESSMENT_NEAR"
  | "CONFIRMED_ERROR_PATTERN"
  | "PREREQUISITE_RISK"
  | "INSUFFICIENT_EVIDENCE"
  | "UNASSISTED_EVIDENCE_NEEDED"
  | "HIGHER_COGNITIVE_LEVEL_NEEDED"
  | "NEW_CONTEXT_NEEDED"
  | "TRANSFER_NEEDED"
  | "CONTRADICTION_NEEDS_RESOLUTION"
  | "NEXT_CURRICULUM_CAPABILITY"
  | "STUDENT_SELECTED_INTENT";

export type TeacherReasonCode =
  | "CLASS_CONFIRMED_ERROR_PATTERN"
  | "CLASS_COGNITIVE_GAP"
  | "CLASS_LOW_EVIDENCE_COVERAGE"
  | "CLASS_PREREQUISITE_RISK"
  | "CLASS_ASSESSMENT_NEAR"
  | "CLASS_NEGATIVE_TREND"
  | "CLASS_INTERVENTION_FOLLOWUP"
  | "CLASS_NEXT_CURRICULUM_OBJECTIVE";

export type ActionFormat = "decision_scenario" | "ai_tutor" | "session_resume";

export type ActionSpec = {
  actionType: StudentActionType;
  format: ActionFormat;
  capabilityId: string | null;
  targetCognitiveLevel: CognitiveLevel | null;
  estimatedMinutes: number;
  targetErrorKey?: string | null;
  launchId?: string | null;
  sessionId?: string | null;
  experienceDefinitionId?: string | null;
  ctaLabel: string;
  href: string;
};

export type RecommendationExplanation = {
  short: string;
  observed: string[];
  missing: string[];
  whyThis: string;
  expectedOutcome: string;
  uncertainty?: string;
};

/** Candidata producida por el motor de sección antes de persistir. */
export type StudentRecommendationCandidate = {
  courseSectionId: string;
  mode: StudentMode;
  domain: "academic_learning" | "continuity" | "assessment_preparation";
  priorityClass: "teacher_required" | "resume" | "urgent" | "review" | "evidence_need" | "advance" | "transfer";
  priorityBand: "low" | "normal" | "high" | "urgent";
  title: string;
  objective: string;
  capabilityIds: string[];
  reasonCodes: StudentReasonCode[];
  actionSpec: ActionSpec;
  explanation: RecommendationExplanation;
  /** Ids de interpretación/lanzamiento/sesión que justifican la recomendación (lineage). */
  sources: { sourceType: "interpretation" | "teacher_action" | "milestone" | "session" | "curriculum"; sourceId: string; reasonCode: string }[];
  dueAt?: Date | null;
  contextHash: string;
};
