import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { aiConversations, aiMessages, rawInteractions, sourceArtifacts } from "@/db/schema";
import { DomainError, notFound } from "@/modules/shared/errors";
import { assertEnrolled, getSection } from "@/modules/academic/service";
import { getCapability, type CapabilityRecord } from "@/modules/curriculum/service";
import { classifySemantic } from "@/modules/evidence/engine";
import { recordSemanticEvidence } from "@/modules/evidence/service";
import { processStudentEvidence } from "@/modules/pipeline";
import { evaluateExplanation } from "@/modules/ai-gateway/tasks/evaluate-explanation";
import { streamText } from "@/modules/ai-gateway/gateway";
import { getStudentHome } from "@/modules/recommendation/service";
import { VISIBLE_STATE_LABEL } from "@/modules/interpretation/engine";
import { getInterpretations } from "@/modules/interpretation/service";
import { track } from "@/modules/shared/outbox";
import type { CognitiveLevel } from "@/modules/shared/enums";
import { genericScript, TUTOR_SCRIPTS, type TutorScript } from "./content";

/**
 * IA integrada del estudiante (S-30, EDU-0302/0303).
 * Modos invisibles: aprendizaje (la IA explica; nada de eso es evidencia) y evidencia
 * ("Ahora probalo por tu cuenta": se evalúa SOLO lo que escribe el estudiante).
 * El mensaje del estudiante se persiste antes de la inferencia.
 */

export const TUTOR_PROMPT_VERSION = "tutor@1.0.0";

type ConvMeta = {
  capabilityId: string;
  intent: "understand" | "transfer" | "probe";
  phase: "learning" | "awaiting_answer" | "done";
  probeQuestion?: string;
  probeLevel?: CognitiveLevel;
  hintsAfterProbe?: number;
  recommendationId?: string | null;
};

function scriptFor(cap: CapabilityRecord): TutorScript {
  return TUTOR_SCRIPTS[cap.stableKey] ?? genericScript(cap.statement, cap.shortLabel, cap.targetCognitiveLevel);
}

async function nextSeq(db: DB, conversationId: string) {
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${aiMessages.sequenceNo}), 0)::int` }).from(aiMessages).where(eq(aiMessages.conversationId, conversationId));
  return Number(n) + 1;
}

export async function createConversation(
  db: DB,
  studentId: string,
  sectionId: string,
  capabilityId: string,
  opts: { intent?: ConvMeta["intent"]; recommendationId?: string | null } = {},
) {
  await assertEnrolled(db, studentId, sectionId);
  const cap = await getCapability(db, sectionId, capabilityId);
  if (!cap) throw notFound("Capacidad");
  const intent = opts.intent ?? "understand";
  const script = scriptFor(cap);
  const meta: ConvMeta = { capabilityId, intent, phase: "learning", recommendationId: opts.recommendationId ?? null };
  const [src] = await db
    .insert(sourceArtifacts)
    .values({
      studentUserId: studentId,
      courseSectionId: sectionId,
      sourceType: "educai_ai_chat",
      title: `Tutor · ${cap.shortLabel}`,
      provenanceQuality: "direct",
      processingStatus: "ready",
      metadata: meta as unknown as Record<string, unknown>,
    })
    .returning();
  const [conv] = await db.insert(aiConversations).values({ sourceArtifactId: src.id, studentUserId: studentId, courseSectionId: sectionId, capabilityId }).returning();
  const opening =
    intent === "transfer"
      ? `Ya tenés evidencia sólida en ${cap.shortLabel}. Ahora vamos a llevarlo a un contexto distinto.`
      : script.intro;
  await db.insert(aiMessages).values({ conversationId: conv.id, sequenceNo: 1, actor: "assistant", mode: "learning", content: opening, promptVersion: "script" });
  if (intent !== "understand") await startProbe(db, conv.id, studentId);
  await track(db, "ai_chat_started", { userId: studentId, courseSectionId: sectionId, properties: { intent } });
  return conv;
}

async function loadConversation(db: DB, studentId: string, conversationId: string) {
  const [row] = await db
    .select({ conv: aiConversations, src: sourceArtifacts })
    .from(aiConversations)
    .innerJoin(sourceArtifacts, eq(sourceArtifacts.id, aiConversations.sourceArtifactId))
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.studentUserId, studentId)))
    .limit(1);
  if (!row || row.src.processingStatus === "deleted") throw notFound("Conversación");
  return { ...row, meta: row.src.metadata as unknown as ConvMeta };
}

async function saveMeta(db: DB, sourceId: string, meta: ConvMeta) {
  await db.update(sourceArtifacts).set({ metadata: meta as unknown as Record<string, unknown> }).where(eq(sourceArtifacts.id, sourceId));
}

export async function getConversationView(db: DB, studentId: string, conversationId: string) {
  const { conv, meta } = await loadConversation(db, studentId, conversationId);
  const cap = await getCapability(db, conv.courseSectionId, conv.capabilityId!);
  const { subject } = await getSection(db, conv.courseSectionId);
  const messages = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conv.id)).orderBy(asc(aiMessages.sequenceNo));
  return {
    id: conv.id,
    sectionId: conv.courseSectionId,
    subjectName: subject.name,
    capability: cap ? { id: cap.id, label: cap.shortLabel, statement: cap.statement } : null,
    phase: meta.phase,
    intent: meta.intent,
    messages: messages.map((m) => ({ id: m.id, actor: m.actor, content: m.content, mode: m.mode, meta: m.assistanceMetadata })),
  };
}

/** "Ahora probalo por tu cuenta": el tutor plantea una consigna nueva en modo evidencia. */
export async function startProbe(db: DB, conversationId: string, studentId: string) {
  const { conv, src, meta } = await loadConversation(db, studentId, conversationId);
  const cap = await getCapability(db, conv.courseSectionId, conv.capabilityId!);
  if (!cap) throw notFound("Capacidad");
  const script = scriptFor(cap);
  const probe = meta.intent === "transfer" && script.transferProbe ? script.transferProbe : script.probe;
  await db.insert(aiMessages).values({
    conversationId: conv.id,
    sequenceNo: await nextSeq(db, conv.id),
    actor: "assistant",
    mode: "evidence",
    content: `Ahora probalo por tu cuenta.\n\n${probe.question}`,
    promptVersion: "script",
    assistanceMetadata: { probe: true },
  });
  await saveMeta(db, src.id, { ...meta, phase: "awaiting_answer", probeQuestion: probe.question, probeLevel: probe.level, hintsAfterProbe: 0 });
}

export async function requestHint(db: DB, studentId: string, conversationId: string) {
  const { conv, src, meta } = await loadConversation(db, studentId, conversationId);
  if (meta.phase !== "awaiting_answer") throw new DomainError("CONFLICT", "No hay una consigna activa.");
  const cap = await getCapability(db, conv.courseSectionId, conv.capabilityId!);
  const script = scriptFor(cap!);
  // La asistencia se registra antes de mostrar la pista: baja el peso de la evidencia de esta respuesta.
  await saveMeta(db, src.id, { ...meta, hintsAfterProbe: (meta.hintsAfterProbe ?? 0) + 1 });
  const hint = (meta.hintsAfterProbe ?? 0) === 0 ? "Pista: separá la situación en partes y preguntate en cada una si es sobre QUÉ construir o sobre CÓMO trabaja el equipo." : script.contrast;
  await db.insert(aiMessages).values({ conversationId: conv.id, sequenceNo: await nextSeq(db, conv.id), actor: "assistant", mode: "evidence", content: hint, promptVersion: "script", assistanceMetadata: { hint: true } });
}

/** Mensaje en modo aprendizaje: respuesta en streaming del modelo o del guion de respaldo. */
export async function learningReply(
  db: DB,
  studentId: string,
  conversationId: string,
  content: string,
  quick: "contrast" | "example" | null,
  onDelta: (t: string) => void | Promise<void>,
) {
  const { conv, meta } = await loadConversation(db, studentId, conversationId);
  const cap = await getCapability(db, conv.courseSectionId, conv.capabilityId!);
  if (!cap) throw notFound("Capacidad");
  const { subject } = await getSection(db, conv.courseSectionId);
  const script = scriptFor(cap);
  const text = content.trim() || (quick === "example" ? "Explicame con un ejemplo." : "Explicámelo de otra manera.");
  // Persistir el mensaje del estudiante antes de la inferencia (EDU-0302).
  await db.insert(aiMessages).values({ conversationId: conv.id, sequenceNo: await nextSeq(db, conv.id), actor: "student", mode: "learning", content: text });
  const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conv.id)).orderBy(asc(aiMessages.sequenceNo));
  const interps = await getInterpretations(db, studentId, conv.courseSectionId);
  const state = interps.find((i) => i.capabilityId === cap.id);
  const errLabels = (state?.unresolvedErrorKeys ?? []).map((k) => cap.knownErrorTypes.find((e) => e.key === k)?.label).filter(Boolean);

  const system = [
    `Sos el tutor de Educai para la materia "${subject.name}". Ayudás a un estudiante universitario a desarrollar esta capacidad: "${cap.statement}".`,
    "Respondé en español rioplatense (voseo), con calidez y precisión, en no más de 120 palabras. Usá ejemplos concretos del contexto de una startup de entregas (Rutas Verdes) cuando sirva.",
    "No resuelvas por el estudiante las consignas de evaluación; si pide la respuesta de una actividad, guialo con preguntas.",
    errLabels.length ? `Dificultad observada en su evidencia (no la menciones como diagnóstico, trabajala con contraste): ${errLabels.join("; ")}.` : "",
    "No inventes contenidos fuera de la currícula de la cátedra.",
  ]
    .filter(Boolean)
    .join("\n");
  const msgs = history
    .filter((m) => m.mode === "learning" || m.actor === "student")
    .map((m) => ({ role: m.actor === "student" ? ("user" as const) : ("assistant" as const), content: m.content }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();

  let reply = await streamText({ db, task: "tutor.learning_reply", promptVersion: TUTOR_PROMPT_VERSION, system, messages: msgs, courseSectionId: conv.courseSectionId, onDelta });
  let model: string | null = "llm";
  if (!reply) {
    model = null;
    reply = quick === "example" ? script.example : quick === "contrast" ? script.contrast : `${script.contrast}\n\nSi querés, pedime un ejemplo o probalo por tu cuenta.`;
    for (const chunk of reply.match(/.{1,24}(\s|$)/g) ?? [reply]) await onDelta(chunk);
  }
  await db.insert(aiMessages).values({
    conversationId: conv.id,
    sequenceNo: await nextSeq(db, conv.id),
    actor: "assistant",
    mode: "learning",
    content: reply,
    modelName: model,
    promptVersion: model ? TUTOR_PROMPT_VERSION : "script",
  });
  void meta;
  return reply;
}

/** Respuesta del estudiante a la consigna: se evalúa y produce evidencia (EDU-0303). */
export async function submitProbeAnswer(db: DB, studentId: string, conversationId: string, content: string) {
  const { conv, src, meta } = await loadConversation(db, studentId, conversationId);
  if (meta.phase !== "awaiting_answer" || !meta.probeQuestion) throw new DomainError("CONFLICT", "No hay una consigna activa.");
  const answer = content.trim();
  if (answer.length < 3) throw new DomainError("VALIDATION", "Escribí tu respuesta para que podamos verla.");
  const cap = await getCapability(db, conv.courseSectionId, conv.capabilityId!);
  if (!cap) throw notFound("Capacidad");
  const seq = await nextSeq(db, conv.id);
  await db.insert(aiMessages).values({ conversationId: conv.id, sequenceNo: seq, actor: "student", mode: "evidence", content: answer });
  const [raw] = await db
    .insert(rawInteractions)
    .values({ sourceArtifactId: src.id, studentUserId: studentId, courseSectionId: conv.courseSectionId, actor: "student", interactionType: "explanation", contentText: answer, sequenceNo: seq })
    .returning();
  const before = (await getInterpretations(db, studentId, conv.courseSectionId)).find((i) => i.capabilityId === cap.id)?.visibleState ?? "unknown";

  const taskLevel = meta.probeLevel ?? "explain";
  const evaluation = await evaluateExplanation({ db, courseSectionId: conv.courseSectionId, capability: cap, question: meta.probeQuestion, studentAnswer: answer, taskLevel });
  const hints = meta.hintsAfterProbe ?? 0;
  const assistance = hints === 0 ? "none" : hints === 1 ? "light_prompting" : "scaffolded";
  const classification = classifySemantic({
    performance: evaluation.performance,
    errorKey: evaluation.errorKey,
    demonstratedLevel: evaluation.demonstratedLevel,
    mappingConfidence: evaluation.mappingConfidence,
    assistance,
    provenance: "direct",
    rationale: evaluation.rationale,
  });
  await recordSemanticEvidence(db, {
    studentId,
    sectionId: conv.courseSectionId,
    sourceArtifactId: src.id,
    sourceType: "educai_ai_chat",
    rawInteractionIds: [raw.id],
    capabilityId: cap.id,
    eventType: taskLevel === "explain" ? "explanation" : "application",
    taskDemand: taskLevel,
    classification,
    mappingConfidence: evaluation.mappingConfidence,
    assistance,
    provenance: "direct",
    familyKey: `probe:${cap.stableKey}:${seq}`,
    dedupeKey: `chat:${src.id}:${seq}`,
    occurredAt: new Date(),
    excerpt: evaluation.paraphrase,
    taskContext: { question: meta.probeQuestion, evaluator: evaluation.evaluator },
  });
  const { changes } = await processStudentEvidence(db, { studentId, sectionId: conv.courseSectionId, trigger: "tutor_probe_answered", sourceArtifactId: src.id });
  const after = changes.find((c) => c.capabilityId === cap.id)?.to ?? before;

  const verdict =
    evaluation.performance === "correct"
      ? "Bien resuelto."
      : evaluation.performance === "partially_correct"
        ? "Vas por buen camino, pero falta una parte."
        : evaluation.performance === "incorrect"
          ? "Todavía aparece una confusión."
          : "No pudimos interpretar tu respuesta con seguridad, así que no la usamos para cambiar tu estado.";
  const errKnown = evaluation.errorKey ? cap.knownErrorTypes.find((e) => e.key === evaluation.errorKey) : null;
  const errLabel = errKnown ? (errKnown.studentLabel ?? errKnown.label) : null;
  const feedback = [verdict, evaluation.rationale, errLabel ? `En particular: ${errLabel.charAt(0).toLowerCase()}${errLabel.slice(1)}.` : "", hints > 0 ? "Como usaste pistas, esta respuesta cuenta como práctica guiada." : ""]
    .filter(Boolean)
    .join(" ");
  const home = await getStudentHome(db, studentId);
  await db.insert(aiMessages).values({
    conversationId: conv.id,
    sequenceNo: seq + 1,
    actor: "assistant",
    mode: "evidence",
    content: feedback,
    promptVersion: "feedback",
    assistanceMetadata: {
      result: {
        performance: evaluation.performance,
        evaluator: evaluation.evaluator,
        from: before,
        to: after,
        fromLabel: VISIBLE_STATE_LABEL[before],
        toLabel: VISIBLE_STATE_LABEL[after],
        next: home.nextAction ? { id: home.nextAction.id, title: home.nextAction.title, minutes: home.nextAction.actionSpec.estimatedMinutes } : null,
      },
    },
  });
  await saveMeta(db, src.id, { ...meta, phase: "done" });
  return { performance: evaluation.performance, from: before, to: after };
}
