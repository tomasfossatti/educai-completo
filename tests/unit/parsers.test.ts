import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isQuestion, keywordHits, overlapRatio, parseTranscript } from "@/modules/sources/transcript";
import { parseProgram } from "@/modules/curriculum/extract";
import { SAMPLE_PROGRAM_TEXT } from "@/modules/curriculum/demo-curriculum";
import { rubricEvaluate } from "@/modules/ai-gateway/fallbacks/rubric";
import { SCRUM_ROLE_ERRORS } from "@/modules/curriculum/demo-curriculum";

describe("Parser de conversaciones TXT/MD", () => {
  it("detecta roles en el formato exportado de ejemplo", () => {
    const r = parseTranscript(readFileSync("public/demo/conversacion-retrospectiva.md", "utf8"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.turns.filter((t) => t.role === "student")).toHaveLength(3);
    expect(r.turns.filter((t) => t.role === "assistant")).toHaveLength(3);
  });

  it("acepta variantes de marcas de rol", () => {
    const r = parseTranscript("Yo: hola, te explico lo que entendí\nClaude: perfecto\n## User\nOtra pregunta larga para probar\n## Assistant\nRespuesta");
    expect(r.ok && r.turns.map((t) => t.role)).toEqual(["student", "assistant", "student", "assistant"]);
  });

  it("no inventa roles si no están marcados", () => {
    expect(parseTranscript("una conversación sin marcas\notra línea")).toEqual({ ok: false, reason: "no_roles" });
  });

  it("utilidades: preguntas, keywords y solapamiento", () => {
    expect(isQuestion("¿Quién facilita la retrospectiva?")).toBe(true);
    expect(keywordHits("La Retrospectiva sirve para la mejora continua", ["retrospectiva", "mejora continua", "kanban"])).toBe(2);
    expect(overlapRatio("el equipo mejora su proceso", "el equipo mejora su proceso cada sprint")).toBeGreaterThan(0.6);
  });
});

describe("Extractor heurístico de programas", () => {
  it("propone unidades, temas y capacidades verificables", () => {
    const d = parseProgram(SAMPLE_PROGRAM_TEXT);
    expect(d.units).toHaveLength(3);
    expect(d.units[1].title).toBe("Unidad 2 · Scrum");
    const caps = d.units.flatMap((u) => u.topics.flatMap((t) => t.capabilities));
    expect(caps.length).toBeGreaterThanOrEqual(8);
    expect(caps.every((c) => /^(Explicar|Diferenciar|Aplicar|Resolver)/.test(c.statement))).toBe(true);
  });

  it("sin encabezados de unidad, usa la lista de temas", () => {
    const d = parseProgram("- Manifiesto ágil\n- Tablero Kanban\n- Métricas de flujo");
    expect(d.units).toHaveLength(1);
    expect(d.units[0].topics).toHaveLength(3);
  });
});

describe("Evaluador de respaldo (sin LLM)", () => {
  const cap = { stableKey: "CAP-SCRUM-03", knownErrorTypes: SCRUM_ROLE_ERRORS, keywords: ["product owner", "scrum master", "priorizar"], targetCognitiveLevel: "apply" as const };
  it("reconoce una explicación correcta", () => {
    const r = rubricEvaluate(cap, "El Product Owner prioriza el backlog según el valor; el Scrum Master facilita y remueve impedimentos del equipo.", "explain");
    expect(r.performance).toBe("correct");
  });
  it("detecta la confusión SM-prioridad", () => {
    const r = rubricEvaluate(cap, "El Scrum Master es quien prioriza el backlog y el Product Owner valida que el producto tenga valor para el cliente.", "explain");
    expect(r).toMatchObject({ performance: "incorrect", errorKey: "sm_prioritizes_backlog" });
  });
  it("ante una respuesta muy breve no concluye", () => {
    expect(rubricEvaluate(cap, "No sé bien", "explain").performance).toBe("indeterminate");
  });
});
