"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, FlaskConical, Loader2, Square, Users } from "lucide-react";
import type { LaunchLiveDTO } from "@/modules/teacher-projection/dto";
import { Button, Card, cx } from "@/ui/primitives";
import { PrivacyNotice } from "@/ui/academic";

/** T-62/T-63: lanzar + vista agregada en vivo. Nunca lista nombres junto a respuestas. */
export function LaunchLive({ initial, qrSvg, link, demoMode }: { initial: LaunchLiveDTO; qrSvg: string; link: string; demoMode: boolean }) {
  const [live, setLive] = useState(initial);
  const [busy, setBusy] = useState<null | "close" | "simulate">(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/teacher/launches/${initial.launchId}/live`, { cache: "no-store" });
      if (r.ok) setLive(await r.json());
    } catch {
      /* el próximo poll reintenta */
    }
  }, [initial.launchId]);

  useEffect(() => {
    if (live.status !== "open") return;
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [poll, live.status]);

  async function simulate() {
    setBusy("simulate");
    setError(null);
    try {
      const r = await fetch(`/api/v1/teacher/launches/${initial.launchId}/simulate`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message);
      await poll();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No pudimos simular la participación.");
    } finally {
      setBusy(null);
    }
  }

  async function close() {
    setBusy("close");
    setError(null);
    try {
      const r = await fetch(`/api/v1/teacher/launches/${initial.launchId}/close`, { method: "POST" });
      if (!r.ok) throw new Error();
      window.location.reload();
    } catch {
      setError("No pudimos cerrar la experiencia. Probá de nuevo.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="p-5 text-center">
          <p className="text-sm font-semibold text-ink-soft">Escaneá para entrar</p>
          <div className="mx-auto mt-3 w-56 max-w-full rounded-lg border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="Código QR de la experiencia" role="img" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Código</p>
          <p className="font-mono text-4xl font-bold tracking-[0.18em]">{live.joinCode}</p>
          <button
            className="mx-auto mt-3 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-semibold text-brand-700 hover:underline"
            onClick={async () => {
              await navigator.clipboard?.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <CheckCircle2 className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Link copiado" : link.replace(/^https?:\/\//, "")}
          </button>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Ingresaron", value: live.joined },
              { label: "Activos ahora", value: live.active },
              { label: "Completaron", value: live.completed },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{s.label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {s.value}
                  <span className="text-base font-semibold text-ink-muted">/{live.enrolled}</span>
                </p>
              </Card>
            ))}
          </div>

          {live.status === "open" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={close} disabled={busy !== null}>
                {busy === "close" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Square className="size-4" aria-hidden />}
                Cerrar y ver qué observamos
              </Button>
              {demoMode && (
                <Button variant="ghost" onClick={simulate} disabled={busy !== null} title="Solo para la demo: estudiantes sintéticos responden por el mismo pipeline real.">
                  {busy === "simulate" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
                  {busy === "simulate" ? "Simulando respuestas…" : "Simular participación del aula (modo demo)"}
                </Button>
              )}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
          {demoMode && live.status === "open" && (
            <p className="text-xs text-ink-muted">
              Modo demo: la simulación hace que estudiantes sintéticos del curso respondan. Sus decisiones pasan por el mismo runtime, evidencia, interpretación y proyección que las de un estudiante real.
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="distribucion">
        <h2 id="distribucion" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
          <Users className="size-4 text-brand-600" aria-hidden /> Cómo está respondiendo el aula
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {live.steps.map((s, i) => (
            <Card key={s.stepId} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Situación {i + 1} · {s.responses} {s.responses === 1 ? "respuesta" : "respuestas"}
              </p>
              <p className="mt-1 font-semibold leading-snug">{s.question}</p>
              {s.distribution ? (
                <ul className="mt-3 space-y-2">
                  {s.distribution.map((o) => (
                    <li key={o.optionId}>
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span className={cx("min-w-0", o.correct && "font-semibold")}>
                          {o.correct && <CheckCircle2 className="mr-1 inline size-3.5 text-solid-600" aria-label="Respuesta adecuada" />}
                          {o.text}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">{o.pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-unknown-50">
                        <div className={cx("h-full rounded-full", o.correct ? "bg-solid-600" : "bg-attention-600/70")} style={{ width: `${o.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3">
                  <PrivacyNotice>Mostramos la distribución cuando haya al menos 5 respuestas, para que nadie quede identificado.</PrivacyNotice>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
