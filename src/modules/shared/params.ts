/**
 * Parámetros configurables de los motores (I:1820-1834, R:2503-2521).
 * Son hipótesis a calibrar con uso real; se versionan junto con el motor.
 */
export const ENGINE_PARAMS = {
  evidenceProcessorVersion: "evidence-0.1.0",
  interpretationEngineVersion: "interp-0.1.0",
  recommendationEngineVersion: "rec-0.1.0",
  projectionVersion: 1,

  // Interpretation
  mappingConfidenceMin: 0.6,
  mappingConfidencePrimary: 0.85,
  solidMinSupportingOpportunities: 2,
  errorConfirmMinOpportunities: 2,
  errorResolveMinLaterSupports: 2,
  currentWindowSize: 5,
  recencyDays: 90,

  // Recommendation
  resumeWindowHours: 72,
  assessmentNearDays: 7,
  maxConsecutiveSameFormat: 2,

  // Teacher / privacy
  minAggregateCellSize: 5,
  lowCoverageThreshold: 0.5,
  minReviewRateForFinding: 0.25,
  teacherAssessmentHorizonDays: 14,
  maxTeacherFindings: 3,
} as const;

export type EngineParams = typeof ENGINE_PARAMS;
