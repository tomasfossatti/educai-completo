import { z } from "zod";
import { COGNITIVE_LEVELS } from "@/modules/shared/enums";

/**
 * Contrato del formato declarativo `decision_scenario` v1 (EDU-0907).
 * Es el JSON que produce el planner/generador y que renderiza el shell confiable.
 * No contiene código: una experiencia generada nunca ejecuta lógica propia.
 */

export const OptionSchema = z.object({
  id: z.string().min(1).max(8),
  text: z.string().min(3).max(400),
  correct: z.boolean(),
  /** Clave del error frecuente que revela esta opción (debe existir en el catálogo de la capacidad). */
  errorKey: z.string().nullable().optional(),
  feedback: z.string().min(10).max(600),
});

export const StepSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  capabilityId: z.string().uuid(),
  cognitiveDemand: z.enum(COGNITIVE_LEVELS),
  scenarioFamily: z.string().min(1),
  /** Identidad estable del ítem entre versiones/sesiones (detecta reintentos del mismo ítem). */
  scenarioKey: z.string().min(1),
  independenceGroup: z.string().min(1),
  situation: z.string().min(20).max(1200),
  question: z.string().min(5).max(300),
  options: z.array(OptionSchema).min(2).max(5),
  hints: z.array(z.string().min(5).max(400)).max(2),
  takeaway: z.string().min(10).max(600),
});

export const DecisionScenarioDefinitionSchema = z.object({
  schemaVersion: z.literal("1.0"),
  format: z.literal("decision_scenario"),
  title: z.string().min(5).max(140),
  description: z.string().min(10).max(400),
  learningObjective: z.string().min(10).max(300),
  estimatedMinutes: z.number().int().min(3).max(40),
  targetCapabilityIds: z.array(z.string().uuid()).min(1),
  targetCognitiveLevel: z.enum(COGNITIVE_LEVELS),
  context: z.object({
    organization: z.string().min(2).max(80),
    intro: z.string().min(20).max(800),
  }),
  steps: z.array(StepSchema).min(2).max(8),
  feedbackPolicy: z.object({ type: z.enum(["immediate", "end_of_experience"]) }),
  assistancePolicy: z.object({ maxHintsPerStep: z.number().int().min(0).max(2), revealAllowed: z.boolean() }),
  evidenceContract: z.object({
    targetCapabilityIds: z.array(z.string().uuid()).min(1),
    requiredCognitiveLevel: z.enum(COGNITIVE_LEVELS),
    requiredOpportunityCount: z.number().int().min(1),
    minimumUnassistedOpportunities: z.number().int().min(0),
    acceptedPerformanceTypes: z.array(z.literal("decision")),
    assistanceConstraints: z.object({ maxLevelForStateEligibility: z.enum(["none", "light_prompting", "scaffolded"]) }),
    expectedErrorTaxonomy: z.array(z.string()),
  }),
  completionRule: z.object({
    type: z.literal("all_required_steps"),
    minimumOpportunitiesAttempted: z.number().int().min(1),
  }),
  personalization: z
    .object({ contextLabel: z.string().optional(), rationale: z.string().optional() })
    .optional(),
});

export type DecisionScenarioDefinition = z.infer<typeof DecisionScenarioDefinitionSchema>;
export type ScenarioStep = z.infer<typeof StepSchema>;
export type ScenarioOption = z.infer<typeof OptionSchema>;

/** Eventos del Experience SDK (EE:1129-1145, subset del formato decision_scenario). */
export const RUNTIME_EVENT_TYPES = [
  "experience_started",
  "experience_resumed",
  "step_viewed",
  "hint_requested",
  "decision_made",
  "feedback_shown",
  "retry_started",
  "reflection_submitted",
  "experience_completed",
] as const;
export type RuntimeEventType = (typeof RUNTIME_EVENT_TYPES)[number];

export const RuntimeEventSchema = z.object({
  event_id: z.string().min(8).max(80),
  sequence_no: z.number().int().min(0),
  event_type: z.enum(RUNTIME_EVENT_TYPES),
  step_id: z.string().nullable().optional(),
  opportunity_id: z.string().nullable().optional(),
  occurred_at: z.string(),
  schema_version: z.literal("1.0"),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type RuntimeEventInput = z.infer<typeof RuntimeEventSchema>;

export const RuntimeEventBatchSchema = z.object({
  session_id: z.string().uuid(),
  batch_id: z.string().min(4),
  sdk_version: z.string().default("1.0.0"),
  events: z.array(RuntimeEventSchema).min(1).max(50),
});
export type RuntimeEventBatch = z.infer<typeof RuntimeEventBatchSchema>;
