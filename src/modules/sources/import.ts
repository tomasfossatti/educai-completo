import "server-only";
import { createHash } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import type { DB } from "@/db/client";
import { rawInteractions, sourceArtifacts } from "@/db/schema";
import { DomainError, notFound } from "@/modules/shared/errors";
import { assertEnrolled, getSection, listStudentSections } from "@/modules/academic/service";
import { getCurriculum } from "@/modules/curriculum/service";
import { classifySemantic } from "@/modules/evidence/engine";
import { recordSemanticEvidence } from "@/modules/evidence/service";
import { evaluateExplanation } from "@/modules/ai-gateway/tasks/evaluate-explanation";
import { processStudentEvidence } from "@/modules/pipeline";
import { getInterpretations } from "@/modules/interpretation/service";
import { getStudentHome } from "@/modules/recommendation/service";
import { emit, track } from "@/modules/shared/outbox";
import type { AssistanceLevel, VisibleState } from "@/modules/shared/enums";
import { isQuestion, keywordHits, overlapRatio, parseTranscript } from "./transcript";

export const MAX_TRANSCRIPT_BYTES = 300_000;
const PARSER_VERSION = "transcript-parser-1.0";

/** S-31 Paso 2: subir y parsear. Queda en `needs_confirmation` hasta que el estudiante confirma. */
export async function uploadTranscript(db: DB, studentId: string, sectionId: string, file: { name: string; content: string; size: number }) {
  await assertEnrolled(db, studentId, sectionId);
  if (file.size > MAX_TRANSCRIPT_BYTES) throw new DomainError("VALIDATION", "El archivo es demasiado grande (máximo 300 KB).");
  if (!/\.(txt|md|markdown)$/i.test(file.name)) throw new DomainError("VALIDATION", "Formato inválido: subí un archivo .txt o .md.");
  if (/<script|\u0000/i.test(file.content)) throw new DomainError("VALIDATION", "El archivo fue rechazado por seguridad.");
  const hash = createHash("sha256").update(file.content.trim()).digest("hex");
  const [dup] = await db
    .select()
    .from(sourceArtifacts)
    .where(and(eq(sourceArtifacts.studentUserId, studentId), eq(sourceArtifacts.contentHash, hash), ne(sourceArtifacts.processingStatus, "deleted")))
    .limit(1);
  if (dup && dup.processingStatus !== "needs_confirmation") throw new DomainError("CONFLICT", "Ya subiste esta conversación: no la contamos dos veces.");
  const parsed = parseTranscript(file.content);
  if (!parsed.ok) {
    throw new DomainError(
      "VALIDATION",
      parsed.reason === "no_roles"
        ? "No pudimos distinguir qué mensajes son tuyos y cuáles de la IA. Pedile a la IA que exporte la conversación marcando cada mensaje (por ejemplo “Usuario:” y “Asistente:”)."
        : "La conversación está vacía o es demasiado corta.",
    );
  }
  const topics = await detectTopics(db, sectionId, file.content);
  const [src] = await db
    .insert(sourceArtifacts)
    .values({
      studentUserId: studentId,
      courseSectionId: sectionId,
      sourceType: "external_ai_transcript",
      title: titleFromFileName(file.name),
      externalProvider: /claude/i.test(file.content) ? "claude" : /chat\s?gpt|gpt/i.test(file.content) ? "chatgpt" : "otra IA",
      contentHash: hash,
      rawContent: file.content,
      provenanceQuality: "user_uploaded",
      processingStatus: "needs_confirmation",
      parserVersion: PARSER_VERSION,
      metadata: { turns: parsed.turns.length, student_turns: parsed.turns.filter((t) => t.role === "student").length },
    })
    .returning();
  await track(db, "external_chat_uploaded", { userId: studentId, courseSectionId: sectionId });
  return { uploadId: src.id, topics };
}

async function detectTopics(db: DB, sectionId: string, text: string) {
  const { capabilities } = await getCurriculum(db, sectionId);
  return capabilities
    .map((c) => ({ id: c.id, label: c.shortLabel, hits: keywordHits(text, c.keywords) }))
    .filter((c) => c.hits >= 2)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 4);
}

/** S-31 Paso 3: resumen para confirmar (conversación, roles, materia, temas probables). */
export async function getUploadSummary(db: DB, studentId: string, uploadId: string) {
  const [src] = await db.select().from(sourceArtifacts).where(and(eq(sourceArtifacts.id, uploadId), eq(sourceArtifacts.studentUserId, studentId))).limit(1);
  if (!src) throw notFound("Archivo");
  const parsed = parseTranscript(src.rawContent ?? "");
  const turns = parsed.ok ? parsed.turns : [];
  const { subject } = await getSection(db, src.courseSectionId);
  const topics = await detectTopics(db, src.courseSectionId, src.rawContent ?? "");
  const others = [];
  if (topics.length === 0) {
    for (const s of await listStudentSections(db, studentId)) {
      if (s.section.id === src.courseSectionId) continue;
      const t = await detectTopics(db, s.section.id, src.rawContent ?? "");
      if (t.length) others.push({ sectionId: s.section.id, subjectName: s.subject.name });
    }
  }
  return {
    id: src.id,
    title: src.title,
    status: src.processingStatus,
    provider: src.externalProvider,
    sectionId: src.courseSectionId,
    subjectName: subject.name,
    studentTurns: turns.filter((t) => t.role === "student").length,
    assistantTurns: turns.filter((t) => t.role === "assistant").length,
    preview: turns.slice(0, 4).map((t) => ({ role: t.role, text: t.text.length > 180 ? `${t.text.slice(0, 177)}…` : t.text })),
    topics,
    otherSections: others,
    result: (src.metadata as { result?: ImportResult }).result ?? null,
  };
}

export type ImportResult = {
  evidenceCount: number;
  skippedQuestions: number;
  transitions: { capabilityId: string; label: string; from: VisibleState; to: VisibleState }[];
  next: { id: string; title: string } | null;
};

export async function changeUploadSection(db: DB, studentId: string, uploadId: string, sectionId: string) {
  await assertEnrolled(db, studentId, sectionId);
  await db
    .update(sourceArtifacts)
    .set({ courseSectionId: sectionId })
    .where(and(eq(sourceArtifacts.id, uploadId), eq(sourceArtifacts.studentUserId, studentId), eq(sourceArtifacts.processingStatus, "needs_confirmation")));
}

/** "Usar como evidencia": RawInteractions → EvidenceEvents (procedencia user_uploaded) → pipeline. */
export async function confirmTranscript(db: DB, studentId: string, uploadId: string): Promise<ImportResult> {
  const [src] = await db.select().from(sourceArtifacts).where(and(eq(sourceArtifacts.id, uploadId), eq(sourceArtifacts.studentUserId, studentId))).limit(1);
  if (!src) throw notFound("Archivo");
  if (src.processingStatus !== "needs_confirmation") {
    const prev = (src.metadata as { result?: ImportResult }).result;
    if (prev) return prev;
    throw new DomainError("CONFLICT", "Esta conversación ya fue procesada.");
  }
  const parsed = parseTranscript(src.rawContent ?? "");
  if (!parsed.ok) throw new DomainError("VALIDATION", "No pudimos leer la conversación.");
  await db.update(sourceArtifacts).set({ processingStatus: "processing" }).where(eq(sourceArtifacts.id, src.id));
  const { capabilities } = await getCurriculum(db, src.courseSectionId);
  const before = await getInterpretations(db, studentId, src.courseSectionId);

  let evidenceCount = 0;
  let skippedQuestions = 0;
  let lastAssistant = "";
  for (const [i, turn] of parsed.turns.entries()) {
    const [raw] = await db
      .insert(rawInteractions)
      .values({ sourceArtifactId: src.id, studentUserId: studentId, courseSectionId: src.courseSectionId, actor: turn.role, interactionType: "message", contentText: turn.text, sequenceNo: i })
      .returning();
    if (turn.role === "assistant") {
      lastAssistant += `\n${turn.text}`;
      continue; // La respuesta de la IA nunca es evidencia del estudiante.
    }
    if (isQuestion(turn.text) || turn.text.length < 60) {
      skippedQuestions++;
      continue;
    }
    if (evidenceCount >= 4) continue;
    const cap = capabilities
      .map((c) => ({ c, hits: keywordHits(turn.text, c.keywords) }))
      .filter((x) => x.hits >= 1)
      .sort((a, b) => b.hits - a.hits)[0]?.c;
    if (!cap) continue;
    // Asistencia: lo producido antes de recibir ayuda vale más; copiar la explicación de la IA no es evidencia independiente.
    const overlap = lastAssistant ? overlapRatio(turn.text, lastAssistant) : 0;
    const assistance: AssistanceLevel = !lastAssistant ? "none" : overlap >= 0.6 ? "answer_revealed" : overlap >= 0.3 ? "scaffolded" : "light_prompting";
    const evaluation = await evaluateExplanation({
      db,
      courseSectionId: src.courseSectionId,
      capability: cap,
      question: "Conversación de estudio importada por el estudiante",
      studentAnswer: turn.text,
      taskLevel: "explain",
    });
    const classification = classifySemantic({
      performance: evaluation.performance,
      errorKey: evaluation.errorKey,
      demonstratedLevel: evaluation.demonstratedLevel,
      mappingConfidence: evaluation.mappingConfidence,
      assistance,
      provenance: "user_uploaded",
      rationale: `${evaluation.rationale} (Conversación con otra IA subida por vos.)`,
    });
    const r = await recordSemanticEvidence(db, {
      studentId,
      sectionId: src.courseSectionId,
      sourceArtifactId: src.id,
      sourceType: "external_ai_transcript",
      rawInteractionIds: [raw.id],
      capabilityId: cap.id,
      eventType: "explanation",
      taskDemand: "explain",
      classification,
      mappingConfidence: evaluation.mappingConfidence,
      assistance,
      provenance: "user_uploaded",
      familyKey: `import:${cap.stableKey}:${i}`,
      dedupeKey: `import:${src.contentHash}:${i}:${cap.id}`,
      occurredAt: new Date(),
      excerpt: evaluation.paraphrase,
      taskContext: { turn_index: i, evaluator: evaluation.evaluator },
    });
    if (r) evidenceCount++;
  }
  await db.update(sourceArtifacts).set({ processingStatus: "ready" }).where(eq(sourceArtifacts.id, src.id));
  await emit(db, { eventType: "learning.source_ready", aggregateType: "source_artifact", aggregateId: src.id, courseSectionId: src.courseSectionId });
  const { changes } = await processStudentEvidence(db, { studentId, sectionId: src.courseSectionId, trigger: "external_transcript_confirmed", sourceArtifactId: src.id });
  const transitions = changes.map((c) => ({
    capabilityId: c.capabilityId,
    label: capabilities.find((x) => x.id === c.capabilityId)?.shortLabel ?? "",
    from: (before.find((b) => b.capabilityId === c.capabilityId)?.visibleState ?? "unknown") as VisibleState,
    to: c.to,
  }));
  const home = await getStudentHome(db, studentId);
  const result: ImportResult = { evidenceCount, skippedQuestions, transitions, next: home.nextAction ? { id: home.nextAction.id, title: home.nextAction.title } : null };
  await db
    .update(sourceArtifacts)
    .set({ metadata: { ...(src.metadata as Record<string, unknown>), result } })
    .where(eq(sourceArtifacts.id, src.id));
  await track(db, "external_chat_confirmed", { userId: studentId, courseSectionId: src.courseSectionId, properties: { evidence: evidenceCount } });
  return result;
}

/** "conversacion-retrospectiva.md" → "Conversacion retrospectiva". */
function titleFromFileName(name: string) {
  const t = name.replace(/\.(txt|md|markdown)$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Conversación importada";
}
