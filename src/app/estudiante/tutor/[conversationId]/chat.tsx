"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Lightbulb, Loader2, Send, Sparkles } from "lucide-react";
import type { VisibleState } from "@/modules/shared/enums";
import { AcademicStateBadge } from "@/ui/academic";
import { Button, LinkButton, cx } from "@/ui/primitives";

type Msg = { id: string; actor: "student" | "assistant" | "system"; content: string; mode: string; meta: Record<string, unknown> };
type Result = { performance: string; from: VisibleState; to: VisibleState; next: { id: string; title: string; minutes: number } | null; evaluator?: string };

export function TutorChat({
  conversationId,
  initialMessages,
  initialPhase,
  sectionId,
}: {
  conversationId: string;
  initialMessages: Msg[];
  initialPhase: "learning" | "awaiting_answer" | "done";
  sectionId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [phase, setPhase] = useState(initialPhase);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  const last = [...messages].reverse().find((m) => m.meta && (m.meta as { result?: Result }).result);
  const result = last ? (last.meta as { result: Result }).result : null;

  async function sendLearning(content: string, quick: "contrast" | "example" | null) {
    setBusy(true);
    setError(null);
    const text = content.trim() || (quick === "example" ? "Explicame con un ejemplo." : "Explicámelo de otra manera.");
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: `${tempId}-s`, actor: "student", content: text, mode: "learning", meta: {} }, { id: `${tempId}-a`, actor: "assistant", content: "", mode: "learning", meta: {} }]);
    setInput("");
    try {
      const r = await fetch(`/api/v1/conversations/${conversationId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content, quick }) });
      if (!r.ok || !r.body) throw new Error();
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === `${tempId}-a` ? { ...x, content: x.content + chunk } : x)));
      }
    } catch {
      setError("No pudimos responder ahora. Tu mensaje quedó guardado; probá de nuevo.");
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  async function startProbe() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/conversations/${conversationId}/probe`, { method: "POST" });
      if (!r.ok) throw new Error();
      setPhase("awaiting_answer");
      router.refresh();
    } catch {
      setError("No pudimos preparar la consigna. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function hint() {
    setBusy(true);
    try {
      await fetch(`/api/v1/conversations/${conversationId}/hint`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function answer() {
    const text = input.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, actor: "student", content: text, mode: "evidence", meta: {} }]);
    setInput("");
    try {
      const r = await fetch(`/api/v1/conversations/${conversationId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message);
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No pudimos evaluar tu respuesta. Quedó guardada; probá de nuevo.");
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  // Sincroniza mensajes del servidor tras router.refresh().
  useEffect(() => setMessages(initialMessages), [initialMessages]);
  useEffect(() => setPhase(initialPhase), [initialPhase]);

  return (
    <div className="flex flex-col gap-4">
      <ol className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={cx("flex gap-2.5", m.actor === "student" && "justify-end")}>
            {m.actor !== "student" && (
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden>
                <Bot className="size-4" />
              </span>
            )}
            <div
              className={cx(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                m.actor === "student" ? "rounded-br-md bg-brand-600 text-white" : m.mode === "evidence" ? "rounded-bl-md border border-brand-200 bg-surface" : "rounded-bl-md bg-surface",
              )}
            >
              {m.content || <Loader2 className="size-4 animate-spin text-ink-muted" aria-label="Escribiendo" />}
            </div>
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      {result && phase === "done" && (
        <div className="rise rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-ink-muted">Cómo quedó esta capacidad</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AcademicStateBadge state={result.from} />
            <ArrowRight className="size-4 text-ink-muted" aria-label="pasó a" />
            <AcademicStateBadge state={result.to} />
          </div>
          {result.next && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <LinkButton href={`/estudiante/recomendaciones/${result.next.id}/empezar`}>
                Siguiente paso: {result.next.title} <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
            </div>
          )}
          <a href={`/estudiante/materias/${sectionId}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Volver a la materia
          </a>
        </div>
      )}

      {phase !== "done" && (
        <div className="sticky bottom-20 z-10 space-y-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-raised)] backdrop-blur sm:bottom-4">
          {phase === "learning" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => sendLearning("", "contrast")}>
                Nueva explicación
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => sendLearning("", "example")}>
                Explicame con un ejemplo
              </Button>
              <Button size="sm" disabled={busy} onClick={startProbe}>
                <Sparkles className="size-4" aria-hidden /> Ahora lo pruebo yo
              </Button>
            </div>
          )}
          {phase === "awaiting_answer" && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-ink-muted">Respondé con tus palabras. Vale más tu razonamiento que la respuesta perfecta.</p>
              <Button size="sm" variant="ghost" disabled={busy} onClick={hint}>
                <Lightbulb className="size-4" aria-hidden /> Pista
              </Button>
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (phase === "awaiting_answer") void answer();
              else if (input.trim()) void sendLearning(input, null);
            }}
          >
            <label htmlFor="msg" className="sr-only">
              Tu mensaje
            </label>
            <textarea
              id="msg"
              rows={phase === "awaiting_answer" ? 3 : 1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={phase === "awaiting_answer" ? "Escribí tu respuesta…" : "Preguntale al tutor…"}
              className="min-h-11 flex-1 resize-none rounded-md border border-line-strong bg-surface px-3 py-2.5 text-[15px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && phase === "learning") {
                  e.preventDefault();
                  if (input.trim()) void sendLearning(input, null);
                }
              }}
            />
            <Button type="submit" disabled={busy || !input.trim()} aria-label="Enviar">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            </Button>
          </form>
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
