"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleHelp, Eye, ListChecks, Target, X } from "lucide-react";
import type { RecommendationExplanation } from "@/modules/recommendation/types";
import { Button, cx } from "./primitives";

const REASONS = [
  { code: "ALREADY_KNOW", label: "Ya sé hacer esto" },
  { code: "NOT_NOW", label: "No quiero trabajarlo ahora" },
  { code: "INTERPRETATION_DOES_NOT_MATCH", label: "La evidencia no representa cómo lo entiendo" },
  { code: "OTHER", label: "Otro" },
];

/** Sheet "¿Por qué me recomendás esto?" (UX §11). */
export function WhySheet({ recommendationId, explanation, triggerClassName }: { recommendationId: string; explanation: RecommendationExplanation; triggerClassName?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [mode, setMode] = useState<"why" | "disagree" | "thanks" | "agreed">("why");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/recommendations/${recommendationId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      return true;
    } catch {
      setError("No pudimos guardar tu respuesta. Probá de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={cx("inline-flex items-center gap-1.5 text-sm font-semibold hover:underline", triggerClassName ?? "text-brand-700")}
        onClick={() => {
          setMode("why");
          ref.current?.showModal();
          void fetch(`/api/v1/recommendations/${recommendationId}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "why_opened" }) });
        }}
      >
        <CircleHelp className="size-4" aria-hidden /> ¿Por qué me recomendás esto?
      </button>
      <dialog
        ref={ref}
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink shadow-[var(--shadow-raised)] sm:m-auto sm:max-w-lg sm:rounded-2xl"
        aria-labelledby={`why-${recommendationId}`}
        onClose={() => {
          if (mode === "thanks") router.refresh();
        }}
      >
        <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={`why-${recommendationId}`} className="text-lg font-semibold">
              {mode === "disagree" ? "¿Qué sentís que Educai está interpretando mal?" : "¿Por qué esto?"}
            </h2>
            <button className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-unknown-50" onClick={() => ref.current?.close()} aria-label="Cerrar">
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {mode === "why" && (
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
              {explanation.observed.length > 0 && (
                <Block icon={<Eye className="size-4" aria-hidden />} title="Qué observamos">
                  <ul className="space-y-1.5">
                    {explanation.observed.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </Block>
              )}
              {explanation.missing.length > 0 && (
                <Block icon={<ListChecks className="size-4" aria-hidden />} title="Qué todavía falta">
                  <ul className="space-y-1.5">
                    {explanation.missing.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </Block>
              )}
              <Block icon={<Target className="size-4" aria-hidden />} title="Por qué esta acción">
                <p>{explanation.whyThis}</p>
                <p className="mt-1.5 text-ink-soft">{explanation.expectedOutcome}</p>
                {explanation.uncertainty && <p className="mt-1.5 text-sm font-semibold text-attention-700">{explanation.uncertainty}</p>}
              </Block>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  variant="secondary"
                  full
                  disabled={busy}
                  onClick={async () => {
                    if (await send({ type: "makes_sense" })) setMode("agreed");
                  }}
                >
                  Tiene sentido
                </Button>
                <Button variant="ghost" full disabled={busy} onClick={() => setMode("disagree")}>
                  No estoy de acuerdo
                </Button>
              </div>
            </div>
          )}

          {mode === "disagree" && (
            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <Button
                  key={r.code}
                  variant="secondary"
                  full
                  disabled={busy}
                  className="justify-start"
                  onClick={async () => {
                    if (await send({ type: "disagree", reason_code: r.code })) setMode("thanks");
                  }}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          )}

          {(mode === "thanks" || mode === "agreed") && (
            <div className="mt-4 space-y-3">
              <p className="flex items-start gap-2 text-[15px]">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-solid-600" aria-hidden />
                {mode === "thanks"
                  ? "Gracias. Vamos a proponerte otra acción. Tu opinión queda registrada para revisar la interpretación; no cambia tu estado automáticamente."
                  : "Gracias por confirmarlo."}
              </p>
              <Button full onClick={() => ref.current?.close()}>
                Listo
              </Button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-error-600" role="alert">{error}</p>}
        </div>
      </dialog>
    </>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
