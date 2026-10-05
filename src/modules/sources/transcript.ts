/**
 * Parser de conversaciones externas (TXT/MD) — EDU-0304/0305.
 * Si no se pueden distinguir los roles, no se inventan: se devuelve error (C:714-756).
 */

export type Turn = { role: "student" | "assistant"; text: string };
export type ParseResult = { ok: true; turns: Turn[] } | { ok: false; reason: "empty" | "no_roles" | "too_short" };

const STUDENT = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(yo|vos|usuario|usuaria|user|t[uú]|estudiante|human|humano|humana|you|me)\s*(?:\*\*|__)?\s*(?:[:：]|$)\s*(?:\*\*|__)?/i;
const ASSISTANT = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(chat\s?gpt|gpt(?:-\d+)?|asistente|assistant|ia|ai|claude|gemini|copilot|bot|modelo|perplexity)\s*(?:\*\*|__)?\s*(?:[:：]|$)\s*(?:\*\*|__)?/i;

export function parseTranscript(raw: string): ParseResult {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text) return { ok: false, reason: "empty" };
  const turns: Turn[] = [];
  let current: Turn | null = null;
  for (const line of text.split("\n")) {
    const s = STUDENT.exec(line);
    const a = s ? null : ASSISTANT.exec(line);
    if (s || a) {
      if (current && current.text.trim()) turns.push({ ...current, text: current.text.trim() });
      const rest = line.slice((s ?? a)![0].length).trim();
      current = { role: s ? "student" : "assistant", text: rest };
    } else if (current) {
      current.text += `\n${line}`;
    }
  }
  if (current && current.text.trim()) turns.push({ ...current, text: current.text.trim() });
  const roles = new Set(turns.map((t) => t.role));
  if (turns.length === 0 || !roles.has("student")) return { ok: false, reason: "no_roles" };
  if (turns.filter((t) => t.role === "student").every((t) => t.text.length < 15)) return { ok: false, reason: "too_short" };
  return { ok: true, turns };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function keywordHits(text: string, keywords: string[]): number {
  const t = norm(text);
  return keywords.reduce((n, k) => n + (t.includes(norm(k)) ? 1 : 0), 0);
}

/** Proporción de palabras del estudiante que ya estaban en la respuesta previa de la IA (copia ≈ respuesta revelada). */
export function overlapRatio(student: string, assistant: string): number {
  const words = (s: string) => new Set(norm(s).split(/[^a-zñ0-9]+/).filter((w) => w.length > 3));
  const a = words(assistant);
  const st = [...words(student)];
  if (st.length === 0 || a.size === 0) return 0;
  return st.filter((w) => a.has(w)).length / st.length;
}

export function isQuestion(text: string): boolean {
  const t = text.trim();
  return t.endsWith("?") && t.length < 220;
}
