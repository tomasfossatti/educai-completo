import type { CognitiveLevel } from "@/modules/shared/enums";

/**
 * Propuesta curricular a partir de un programa (EDU-0204/0205).
 * Extractor heurístico determinista; si hay IA disponible, el servicio usa el extractor con LLM
 * y cae a este cuando falla. El docente siempre valida antes de activar ("Así entendimos tu materia").
 */

export type DraftCapability = { statement: string; shortLabel: string; level: CognitiveLevel; keywords: string[] };
export type DraftTopic = { title: string; capabilities: DraftCapability[] };
export type DraftUnit = { title: string; topics: DraftTopic[] };
export type DraftCurriculum = { units: DraftUnit[] };

const UNIT = /^\s*(?:#+\s*)?(unidad|m[oó]dulo|bloque|eje|parte)\s*([ivxlc]+|\d+)?\s*[:.\-–—)]?\s*(.*)$/i;
const BULLET = /^\s*(?:[-•*·▪◦]|\d+[.)]|[a-z][.)])\s+(.+)$/i;
const STOP = new Set(["para", "como", "entre", "sobre", "desde", "hasta", "con", "los", "las", "del", "una", "uno", "que", "sus", "por", "and", "the"]);

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/[.;:]+$/, "").trim();
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function keywordsOf(title: string): string[] {
  return [...new Set(title.toLowerCase().split(/[^a-záéíóúñü0-9]+/i).filter((w) => w.length >= 4 && !STOP.has(w)))].slice(0, 5);
}

function capabilityFor(topic: string): DraftCapability {
  const t = clean(topic);
  const lower = t.toLowerCase();
  let statement: string;
  let level: CognitiveLevel = "explain";
  if (/^diferencias? entre /i.test(lower)) {
    statement = `Diferenciar ${t.replace(/^diferencias? entre /i, "")}`;
    level = "apply";
  } else if (/^(diferenci|compar|distingu)/i.test(lower) || /\b(vs\.?|versus)\b/.test(lower)) {
    statement = /^(diferenci|compar|distingu)/i.test(lower) ? cap1(t) : `Diferenciar ${low1(t)}`;
    level = "apply";
  } else if (/^(aplic|resolv|calcul|diseñ|elabor|constru|analiz|evalu)/i.test(lower)) {
    statement = cap1(t);
    level = /^(resolv|diseñ|evalu)/i.test(lower) ? "solve" : "apply";
  } else {
    statement = `Explicar ${low1(t)}`;
  }
  return { statement, shortLabel: t.length > 60 ? `${t.slice(0, 57)}…` : t, level, keywords: keywordsOf(t) };
}

export function parseProgram(text: string): DraftCurriculum {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const units: DraftUnit[] = [];
  let current: DraftUnit | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const u = UNIT.exec(line);
    if (u && (u[3]?.length ?? 0) < 120) {
      const n = units.length + 1;
      current = { title: `Unidad ${n} · ${cap1(clean(u[3] || `${u[1]} ${u[2] ?? n}`))}`, topics: [] };
      units.push(current);
      continue;
    }
    const b = BULLET.exec(line);
    if (b && current) {
      const title = clean(b[1]);
      if (title.length >= 3 && title.length <= 160) current.topics.push({ title: cap1(title), capabilities: [capabilityFor(title)] });
    }
  }
  if (units.length === 0) {
    const topics = lines
      .map((l) => BULLET.exec(l.trim()))
      .filter(Boolean)
      .map((b) => clean(b![1]))
      .filter((t) => t.length >= 3)
      .slice(0, 12)
      .map((t) => ({ title: cap1(t), capabilities: [capabilityFor(t)] }));
    if (topics.length) units.push({ title: "Unidad 1 · Contenidos del programa", topics });
  }
  // Cada unidad suma una capacidad de aplicación integradora (Comprender → Aplicar).
  for (const u of units) {
    if (u.topics.length === 0) continue;
    const name = u.title.replace(/^Unidad\s+\d+\s*·\s*/, "");
    u.topics[u.topics.length - 1].capabilities.push({
      statement: `Aplicar los conceptos de ${low1(name)} en un caso concreto`,
      shortLabel: `Aplicar ${low1(name)}`.slice(0, 48),
      level: "apply",
      keywords: keywordsOf(name),
    });
  }
  return { units: units.filter((u) => u.topics.length > 0) };
}
