import type { KnownErrorType } from "@/db/schema/curriculum";
import type { CognitiveLevel, Performance } from "@/modules/shared/enums";

/**
 * Evaluador determinista de respaldo (sin LLM). Es deliberadamente conservador:
 * busca conceptos requeridos y patrones de error conocidos; ante duda devuelve "indeterminate",
 * que el Evidence Engine no usa para cambiar estados.
 */

type Rubric = { required: RegExp[][]; misconceptions: { pattern: RegExp; errorKey: string }[] };

const PO = /(product owner|\bpo\b|dueñ[oa] del producto)/i;
const SM = /(scrum master|\bsm\b)/i;

const RUBRICS: Record<string, Rubric> = {
  "CAP-SCRUM-03": {
    required: [
      [PO, /(prioriz|orden|valor|backlog|qu[eé] se (hace|construye)|requisit|necesidad)/i],
      [SM, /(facilit|impediment|obst[aá]cul|coach|acompa|proceso|ayuda al equipo|eventos)/i],
    ],
    misconceptions: [
      { pattern: /(scrum master|\bsm\b)[^.]{0,60}(prioriz|ordena el backlog|decide qu[eé] (se hace|entra)|define (los )?requisit)/i, errorKey: "sm_prioritizes_backlog" },
      { pattern: /(product owner|\bpo\b)[^.]{0,60}(impediment|facilit|resuelve (los )?problemas del equipo|coach)/i, errorKey: "po_removes_impediments" },
      { pattern: /(scrum master|\bsm\b|product owner|\bpo\b)[^.]{0,40}(jefe|asigna (las )?tareas|manda|controla (a|al) (cada|equipo))/i, errorKey: "role_as_manager" },
    ],
  },
  "CAP-SCRUM-01": { required: [[/(valor|prioriz|orden)/i], [/(backlog|producto)/i]], misconceptions: [] },
  "CAP-SCRUM-02": { required: [[/(facilit|impediment|coach|ayuda|acompa)/i], [/(equipo|scrum|proceso)/i]], misconceptions: [] },
  "CAP-SPRINT-01": {
    required: [[/(duraci[oó]n fija|tiempo fijo|timebox|semanas|per[ií]odo|iteraci[oó]n)/i], [/(incremento|entrega|objetivo|producto)/i]],
    misconceptions: [],
  },
  "CAP-ART-01": {
    required: [[/product backlog/i, /(todo|lista|pendiente|producto|product owner|\bpo\b)/i], [/sprint backlog/i, /(sprint|plan|developers|equipo|seleccion)/i]],
    misconceptions: [{ pattern: /(son|es) (la misma|lo mismo)/i, errorKey: "backlogs_same_list" }],
  },
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function rubricEvaluate(
  capability: { stableKey: string; knownErrorTypes: KnownErrorType[]; keywords: string[]; targetCognitiveLevel: CognitiveLevel },
  answer: string,
  taskLevel: CognitiveLevel,
): { performance: Performance; demonstratedLevel: CognitiveLevel; errorKey: string | null; mappingConfidence: number; rationale: string; paraphrase: string } {
  const text = answer.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const kwHits = capability.keywords.filter((k) => norm(text).includes(norm(k))).length;
  const mappingConfidence = kwHits >= 2 ? 0.9 : kwHits === 1 ? 0.7 : 0.4;
  const paraphrase = text.length > 220 ? `${text.slice(0, 217)}…` : text;

  if (words < 8) {
    return { performance: "indeterminate", demonstratedLevel: taskLevel, errorKey: null, mappingConfidence, rationale: "La respuesta es demasiado breve para interpretarla.", paraphrase };
  }
  const rubric = RUBRICS[capability.stableKey];
  if (rubric) {
    const mis = rubric.misconceptions.find((m) => m.pattern.test(text) && capability.knownErrorTypes.some((e) => e.key === m.errorKey));
    if (mis) {
      const label = capability.knownErrorTypes.find((e) => e.key === mis.errorKey)?.label ?? "error frecuente";
      return { performance: "incorrect", demonstratedLevel: taskLevel, errorKey: mis.errorKey, mappingConfidence: Math.max(mappingConfidence, 0.8), rationale: `La explicación muestra un error frecuente: ${label.toLowerCase()}.`, paraphrase };
    }
    const met = rubric.required.filter((group) => group.every((r) => r.test(text))).length;
    if (met === rubric.required.length) {
      return { performance: "correct", demonstratedLevel: taskLevel, errorKey: null, mappingConfidence: Math.max(mappingConfidence, 0.85), rationale: "La explicación incluye los elementos centrales de la capacidad.", paraphrase };
    }
    if (met > 0) {
      return { performance: "partially_correct", demonstratedLevel: taskLevel, errorKey: null, mappingConfidence, rationale: "La explicación cubre parte de los elementos esperados.", paraphrase };
    }
    return { performance: "indeterminate", demonstratedLevel: taskLevel, errorKey: null, mappingConfidence, rationale: "No encontramos en la respuesta los elementos que permiten interpretarla.", paraphrase };
  }
  // Capacidad sin rúbrica específica: sin LLM no alcanza para afirmar desempeño.
  return {
    performance: kwHits >= 2 && words >= 25 ? "partially_correct" : "indeterminate",
    demonstratedLevel: taskLevel,
    errorKey: null,
    mappingConfidence,
    rationale: "Sin un evaluador semántico disponible, registramos la respuesta como evidencia no concluyente.",
    paraphrase,
  };
}
