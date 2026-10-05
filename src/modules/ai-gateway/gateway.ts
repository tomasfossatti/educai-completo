import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { DB } from "@/db/client";
import { aiCalls } from "@/db/schema";

/**
 * AI Gateway (TA §21-26, ADR-010): toda llamada a modelos pasa por acá.
 * - cada tarea declara `task` y `promptVersion`;
 * - las salidas estructuradas se validan con schema antes de tocar el dominio;
 * - timeout, reintento acotado y fallback determinista si no hay credenciales o la salida es inválida;
 * - telemetría de latencia, tokens y costo estimado en `ai_calls`.
 * El dominio nunca referencia nombres de modelos: se configuran acá (EDUCAI_MODEL).
 */

const MODEL = process.env.EDUCAI_MODEL ?? "claude-opus-5-5";
// Precios de referencia por millón de tokens (input/output) para el costo estimado.
const PRICE = { input: 4, output: 20 };
// Si el modelo declina por política, la API reintenta con un modelo de respaldo en la misma llamada.
const FALLBACK_BETA = "server-side-fallback-2026-07-01" as const;

export type Effort = "low" | "medium" | "high";

export function aiEnabled(): boolean {
  if (process.env.EDUCAI_AI === "off") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ maxRetries: 1 });
  return client;
}

async function logCall(
  db: DB | null,
  row: {
    task: string;
    promptVersion: string;
    status: "ok" | "invalid_output" | "error" | "fallback";
    fallbackUsed: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
    courseSectionId?: string | null;
  },
) {
  if (!db) return;
  const inputTokens = row.inputTokens ?? 0;
  const outputTokens = row.outputTokens ?? 0;
  try {
    await db.insert(aiCalls).values({
      task: row.task,
      promptVersion: row.promptVersion,
      model: row.fallbackUsed && row.status === "fallback" ? null : MODEL,
      status: row.status,
      fallbackUsed: row.fallbackUsed,
      latencyMs: row.latencyMs,
      inputTokens,
      outputTokens,
      costUsdEstimate: (inputTokens * PRICE.input + outputTokens * PRICE.output) / 1_000_000,
      error: row.error ?? null,
      courseSectionId: row.courseSectionId ?? null,
    });
  } catch {
    // La telemetría nunca rompe el flujo.
  }
}

export type StructuredResult<T> = { ok: true; data: T } | { ok: false; reason: "disabled" | "invalid_output" | "refusal" | "error" };

export async function invokeStructured<S extends z.ZodType>(args: {
  db: DB | null;
  task: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
  timeoutMs?: number;
  courseSectionId?: string | null;
  /** Invariantes semánticas adicionales al schema (TA:1195-1207). */
  validate?: (data: z.infer<S>) => string | null;
}): Promise<StructuredResult<z.infer<S>>> {
  const start = Date.now();
  if (!aiEnabled()) {
    await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "fallback", fallbackUsed: true, latencyMs: 0, courseSectionId: args.courseSectionId });
    return { ok: false, reason: "disabled" };
  }
  try {
    const response = await getClient().beta.messages.parse(
      {
        model: MODEL,
        max_tokens: args.maxTokens ?? 8000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: args.system,
        output_config: { effort: args.effort ?? "low", format: betaZodOutputFormat(args.schema) },
        messages: [{ role: "user", content: args.user }],
      },
      { timeout: args.timeoutMs ?? 60_000 },
    );
    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    if (response.stop_reason === "refusal") {
      await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "error", fallbackUsed: true, latencyMs: Date.now() - start, error: "refusal", courseSectionId: args.courseSectionId, ...usage });
      return { ok: false, reason: "refusal" };
    }
    const parsed = response.parsed_output as z.infer<S> | null;
    const invalid = parsed == null ? "schema" : args.validate?.(parsed);
    if (parsed == null || invalid) {
      await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "invalid_output", fallbackUsed: true, latencyMs: Date.now() - start, error: String(invalid), courseSectionId: args.courseSectionId, ...usage });
      return { ok: false, reason: "invalid_output" };
    }
    await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "ok", fallbackUsed: false, latencyMs: Date.now() - start, courseSectionId: args.courseSectionId, ...usage });
    return { ok: true, data: parsed };
  } catch (err) {
    const message = err instanceof Anthropic.APIError ? `${err.status ?? ""} ${err.message}` : err instanceof Error ? err.message : String(err);
    await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "error", fallbackUsed: true, latencyMs: Date.now() - start, error: message.slice(0, 500), courseSectionId: args.courseSectionId });
    return { ok: false, reason: "error" };
  }
}

/** Texto en streaming para el tutor. Devuelve null si la IA no está disponible (el caller usa su fallback). */
export async function streamText(args: {
  db: DB | null;
  task: string;
  promptVersion: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  effort?: Effort;
  courseSectionId?: string | null;
  onDelta: (text: string) => void | Promise<void>;
}): Promise<string | null> {
  if (!aiEnabled()) return null;
  const start = Date.now();
  try {
    const stream = getClient().beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 4000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: args.system,
        output_config: { effort: args.effort ?? "low" },
        messages: args.messages,
      },
      { timeout: 60_000 },
    );
    let text = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        await args.onDelta(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    await logCall(args.db, {
      task: args.task,
      promptVersion: args.promptVersion,
      status: final.stop_reason === "refusal" ? "error" : "ok",
      fallbackUsed: false,
      latencyMs: Date.now() - start,
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      courseSectionId: args.courseSectionId,
    });
    if (final.stop_reason === "refusal" || !text.trim()) return null;
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logCall(args.db, { task: args.task, promptVersion: args.promptVersion, status: "error", fallbackUsed: true, latencyMs: Date.now() - start, error: message.slice(0, 500), courseSectionId: args.courseSectionId });
    return null;
  }
}
