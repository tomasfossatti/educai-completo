import type {
  AssistanceLevel,
  AttentionState,
  CognitiveLevel,
  ErrorPatternStatus,
  EvidenceSufficiency,
  InterpretationConfidence,
  MaturityState,
  NextEvidenceNeedType,
  Performance,
  Polarity,
  QualityBand,
  SourceType,
  VisibleState,
} from "@/modules/shared/enums";

/** Señal tal como la consume el Interpretation Engine (I:133-151). */
export type InterpretationSignal = {
  id: string;
  capabilityId: string;
  opportunityId: string;
  independenceGroupKey: string;
  sourceArtifactId: string;
  sourceType: SourceType;
  performance: Performance;
  polarity: Polarity;
  demonstratedLevel: CognitiveLevel;
  taskCognitiveDemand: CognitiveLevel;
  normalizedErrorKey: string | null;
  mappingConfidence: number;
  qualityBand: QualityBand;
  assistanceLevel: AssistanceLevel;
  stateEligible: boolean;
  valid: boolean;
  occurredAt: Date;
};

export type CapabilityContext = {
  id: string;
  targetLevel: CognitiveLevel;
};

export type OpportunityAssessment = {
  opportunityId: string;
  independenceGroupKey: string;
  sourceArtifactId: string;
  sourceType: SourceType;
  result: "supports" | "challenges" | "mixed" | "indeterminate";
  quality: QualityBand;
  demonstratedLevel: CognitiveLevel;
  taskDemand: CognitiveLevel;
  assistanceLevel: AssistanceLevel;
  errorKeys: string[];
  signalIds: string[];
  occurredAt: Date;
  /** supports con nivel ≥ target. */
  supportsAtTarget: boolean;
  /** challenges con demanda ≥ target. */
  challengesAtTarget: boolean;
};

export type NextEvidenceNeed = {
  type: NextEvidenceNeedType;
  targetLevel?: CognitiveLevel;
  errorKey?: string;
  reason: string;
};

export type ErrorPatternResult = {
  key: string;
  status: ErrorPatternStatus;
  rule?: "A" | "B";
  opportunityIds: string[];
  signalIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
};

export type ContradictionResult = {
  type: "level" | "source" | "assistance";
  supportingOpportunityIds: string[];
  challengingOpportunityIds: string[];
  interpretation: string;
  nextEvidenceNeeded: NextEvidenceNeedType;
};

export type InterpretationRationale = {
  stateReasonCodes: string[];
  supportingEvidenceIds: string[];
  challengingEvidenceIds: string[];
  resolvedErrorPatternKeys: string[];
  unresolvedErrorPatternKeys: string[];
  sufficiencyReason: string;
};

export type InterpretationResult = {
  capabilityId: string;
  maturityState: MaturityState;
  attentionState: AttentionState;
  visibleState: VisibleState;
  evidenceSufficiency: EvidenceSufficiency;
  interpretationConfidence: InterpretationConfidence;
  highestReliablyDemonstratedLevel: CognitiveLevel | null;
  supportingOpportunityIds: string[];
  challengingOpportunityIds: string[];
  errorPatterns: ErrorPatternResult[];
  contradictions: ContradictionResult[];
  nextEvidenceNeed: NextEvidenceNeed;
  rationale: InterpretationRationale;
  eligibleOpportunityCount: number;
  engineVersion: string;
};
