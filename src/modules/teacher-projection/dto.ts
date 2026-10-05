/**
 * DTOs de las vistas docentes. Por contrato NO contienen identificadores ni nombres de estudiantes
 * (API invariante 1, ADR-007). El contract test serializa estos objetos y verifica la ausencia de identidad.
 */

export type FindingCardDTO = {
  findingId: string;
  type: "needs_review" | "low_coverage" | "cognitive_gap";
  capabilityLabel: string;
  headline: string;
  detail: string;
  rate: number | null;
  numerator: number;
  denominator: number;
  enrolled: number;
  priority: number;
  reasonCodes: string[];
};

export type InterventionDTO = {
  strategy: "decision_scenario" | "diagnostic_probe";
  title: string;
  minutes: number;
  why: string;
  inClass: string;
  existingDefinitionId: string | null;
  existingDefinitionTitle: string | null;
  openLaunchId: string | null;
};

export type TeacherHomeDTO = {
  section: { id: string; name: string; term: string; subjectName: string; joinCode: string };
  progress: {
    classIndex: number;
    plannedClasses: number;
    timePct: number;
    currentTopic: string | null;
    currentClassTitle: string | null;
    nextMilestone: { title: string; inDays: number } | null;
  };
  state: "no_evidence" | "low_coverage" | "normal_priorities" | "no_attention_required";
  priorities: FindingCardDTO[];
  recommended: ({ findingId: string } & InterventionDTO) | null;
  improvement: { worked: string; mainOpportunity: string; tryNext: string; respondents: number | null } | null;
  coverage: { enrolled: number; averageCoveragePct: number };
  activeLaunch: { launchId: string; title: string; joinCode: string } | null;
};

export type CapabilityMapRowDTO = {
  capabilityId: string;
  label: string;
  statement: string;
  level: string;
  schedule: string;
  enrolled: number;
  sufficient: number;
  coveragePct: number;
  reviewRatePct: number | null;
  reviewCount: number | null;
  solidCount: number | null;
  trend: "improving" | "stable" | "worsening" | "unknown";
  status: "ok" | "attention" | "insufficient_coverage" | "not_started";
  findingId: string | null;
};

export type FindingDetailDTO = {
  findingId: string;
  type: "needs_review" | "low_coverage" | "cognitive_gap";
  capability: { id: string; label: string; statement: string; level: string };
  decide: { headline: string; detail: string; intervention: InterventionDTO };
  understand: {
    numerator: number;
    denominator: number;
    enrolled: number;
    ratePct: number | null;
    howCalculated: string;
    cognitiveGap: string | null;
    reasons: string[];
    assessmentInDays: number | null;
    prerequisiteOf: string[];
  };
  audit: {
    sourceTypes: { type: string; count: number }[];
    patterns: { label: string; count: number }[];
    otherPatternsSuppressed: boolean;
    examples: { situation: string; question: string; chosenAnswer: string; students: number; errorLabel: string | null }[];
    examplesSuppressed: boolean;
    contradictions: number | null;
    timeline: { day: string; evidenceCount: number }[];
    lastValidation: string | null;
  };
};

export type ClassroomProfileDTO = {
  respondents: number;
  enrolled: number;
  suppressed: boolean;
  interests: { visible: { label: string; count: number; pct: number }[]; hiddenCategories: number };
  exposure: { visible: { label: string; count: number; pct: number }[]; hiddenCategories: number };
  workingPct: number | null;
};

export type LaunchLiveDTO = {
  launchId: string;
  status: "scheduled" | "open" | "closed" | "cancelled";
  title: string;
  joinCode: string;
  enrolled: number;
  joined: number;
  active: number;
  completed: number;
  steps: {
    stepId: string;
    question: string;
    responses: number;
    distribution: { optionId: string; text: string; correct: boolean; count: number; pct: number }[] | null;
  }[];
};

export type LaunchResultDTO = {
  launchId: string;
  title: string;
  status: string;
  participants: number;
  completed: number;
  capability: { id: string; label: string };
  before: { ratePct: number | null; numerator: number; denominator: number; enrolled: number };
  after: { ratePct: number | null; numerator: number; denominator: number; enrolled: number };
  patterns: { label: string; count: number }[];
  hardestStep: { question: string; correctPct: number } | null;
  nextIntervention: { headline: string; findingId: string | null; detail: string } | null;
};
