"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Lightbulb, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { ExperienceSDK } from "@/lib/experience-sdk";
import type { VisibleState } from "@/modules/shared/enums";
import { AcademicStateBadge } from "@/ui/academic";
import { Button, LinkButton, cx } from "@/ui/primitives";

type Step = {
  id: string;
  opportunityId: string;
  situation: string;
  question: string;
  options: { id: string; text: string }[];
  hintsAvailable: number;
  hintsShown: string[];
  answer: { optionId: string; correct: boolean; feedback: string; takeaway: string; correctOptionId: string; correctText: string } | null;
};

export type PlayerView = {
  sessionId: string;
  status: string;
  launchId: string | null;
  subjectName: string;
  capabilityLabel: string;
  title: string;
  description: string;
  objective: string;
  estimatedMinutes: number;
  context: { organization: string; intro: string };
  lastSequenceNo: number;
  steps: Step[];
  result: Feedback | null;
};

type Feedback = {
  correct: number;
  total: number;
  hintsUsed: number;
  strengthened: string[];
  toReview: string[];
  transitions: { capabilityId: string; label: string; from: VisibleState; to: VisibleState }[];
  insufficientNote: string | null;
  next: { recommendationId: string; title: string; reason: string; minutes: number; subjectName: string } | null;
  launchId: string | null;
};

export function ExperiencePlayer({ initial }: { initial: PlayerView }) {
  const sdk = useMemo(() => new ExperienceSDK(initial.sessionId, initial.lastSequenceNo), [initial.sessionId, initial.lastSequenceNo]);
  const [steps, setSteps] = useState<Step[]>(initial.steps);
  const firstOpen = steps.findIndex((s) => !s.answer);
  const [index, setIndex] = useState(firstOpen === -1 ? steps.length - 1 : firstOpen);
  const [started, setStarted] = useState(initial.status !== "created" || steps.some((s) => s.answer));
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "decision" | "hint" | "complete" | "start">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Feedback | null>(initial.result);
  const viewed = useRef(new Set<string>());

  const step = steps[index];
  const answered = steps.filter((s) => s.answer).length;
  const allAnswered = answered === steps.length;

  async function begin() {
    setBusy("start");
    setError(null);
    try {
      await sdk.emit("experience_started");
      setStarted(true);
      void markViewed(0);
    } catch {
      setError("No pudimos empezar. Revisá tu conexión y probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function markViewed(i: number) {
    const s = steps[i];
    if (!s || viewed.current.has(s.id)) return;
    viewed.current.add(s.id);
    try {
      await sdk.emit("step_viewed", { stepId: s.id, opportunityId: s.opportunityId });
    } catch {
      /* no bloquea al estudiante */
    }
  }

  async function hint() {
    if (!step) return;
    setBusy("hint");
    setError(null);
    try {
      const r = await sdk.emit("hint_requested", { stepId: step.id, opportunityId: step.opportunityId });
      if (r?.type === "hint") setSteps((all) => all.map((s) => (s.id === step.id ? { ...s, hintsShown: [...s.hintsShown, r.hint].slice(0, r.hintsUsed) } : s)));
    } catch {
      setError("No pudimos traer la pista. Probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function decide() {
    if (!step || !selected) return;
    setBusy("decision");
    setError(null);
    try {
      const r = await sdk.emit("decision_made", { stepId: step.id, opportunityId: step.opportunityId, payload: { option_id: selected } });
      if (r?.type === "feedback") {
        setSteps((all) =>
          all.map((s) =>
            s.id === step.id
              ? { ...s, answer: { optionId: selected, correct: r.correct, feedback: r.feedback, takeaway: r.takeaway, correctOptionId: r.correctOptionId, correctText: r.correctText } }
              : s,
          ),
        );
      }
    } catch {
      // La selección queda en pantalla: nunca perder la respuesta del estudiante.
      setError("No pudimos guardar tu decisión. Tu selección sigue acá: probá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  function next() {
    const n = Math.min(index + 1, steps.length - 1);
    setSelected(null);
    setIndex(n);
    void markViewed(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    setBusy("complete");
    setError(null);
    try {
      const fb = (await sdk.complete()) as Feedback;
      setResult(fb);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cerrar la actividad.");
    } finally {
      setBusy(null);
    }
  }

  if (result) return <ResultView result={result} title={initial.title} />;

  if (!started) {
    return (
      <div className="rise space-y-5">
        <Header view={initial} answered={answered} />
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{initial.context.organization}</p>
          <p className="mt-2 text-[15px] leading-relaxed">{initial.context.intro}</p>
          <div className="mt-4 rounded-md bg-canvas p-3 text-sm text-ink-soft">
            <span className="font-semibold text-ink">Objetivo: </span>
            {initial.objective}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
            <li>• {steps.length} situaciones, una decisión en cada una.</li>
            <li>• Después de cada decisión vas a ver por qué es o no la mejor opción.</li>
            <li>• Podés pedir pistas: suman ayuda, y eso también lo tenemos en cuenta.</li>
          </ul>
          <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={begin} disabled={busy !== null}>
            {busy === "start" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ArrowRight className="size-5" aria-hidden />}
            Empezar
          </Button>
          {error && <p role="alert" className="mt-3 text-sm text-error-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header view={initial} answered={answered} />
      <ol className="flex gap-1.5" aria-label="Progreso">
        {steps.map((s, i) => (
          <li key={s.id} className={cx("h-1.5 flex-1 rounded-full", s.answer ? (s.answer.correct ? "bg-solid-600" : "bg-attention-600") : i === index ? "bg-brand-500" : "bg-line")}>
            <span className="sr-only">
              Situación {i + 1}: {s.answer ? (s.answer.correct ? "resuelta bien" : "para revisar") : i === index ? "actual" : "pendiente"}
            </span>
          </li>
        ))}
      </ol>

      <article key={step.id} className="rise rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby={`q-${step.id}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Situación {index + 1} de {steps.length}
        </p>
        <p className="mt-3 text-[16px] leading-relaxed">{step.situation}</p>
        <h2 id={`q-${step.id}`} className="mt-4 text-lg font-semibold leading-snug">
          {step.question}
        </h2>

        <fieldset className="mt-4 space-y-2.5" disabled={!!step.answer || busy === "decision"}>
          <legend className="sr-only">Opciones</legend>
          {step.options.map((o) => {
            const chosen = step.answer?.optionId === o.id || (!step.answer && selected === o.id);
            const isCorrect = step.answer?.correctOptionId === o.id;
            return (
              <label
                key={o.id}
                className={cx(
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-[15px] leading-snug transition-colors",
                  step.answer
                    ? isCorrect
                      ? "border-solid-600 bg-solid-50"
                      : chosen
                        ? "border-attention-600 bg-attention-50"
                        : "border-line opacity-70"
                    : chosen
                      ? "border-brand-500 bg-brand-50"
                      : "border-line hover:border-brand-200",
                )}
              >
                <input type="radio" name={step.id} value={o.id} checked={chosen} onChange={() => setSelected(o.id)} className="mt-1 size-4 accent-[var(--color-brand-600)]" />
                <span className="flex-1">{o.text}</span>
                {step.answer && isCorrect && <CheckCircle2 className="size-5 shrink-0 text-solid-600" aria-label="Mejor opción" />}
                {step.answer && chosen && !isCorrect && <XCircle className="size-5 shrink-0 text-attention-600" aria-label="Tu elección" />}
              </label>
            );
          })}
        </fieldset>

        {step.hintsShown.length > 0 && (
          <div className="mt-4 space-y-2">
            {step.hintsShown.map((h, i) => (
              <p key={i} className="flex items-start gap-2 rounded-md bg-attention-50 px-3 py-2 text-sm text-attention-700">
                <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden /> {h}
              </p>
            ))}
          </div>
        )}

        {step.answer ? (
          <div className={cx("rise mt-5 rounded-lg p-4", step.answer.correct ? "bg-solid-50" : "bg-attention-50")} role="status">
            <p className={cx("flex items-center gap-2 font-semibold", step.answer.correct ? "text-solid-700" : "text-attention-700")}>
              {step.answer.correct ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
              {step.answer.correct ? "Bien decidido" : "No es la mejor opción"}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed">{step.answer.feedback}</p>
            {!step.answer.correct && (
              <p className="mt-2 text-[15px]">
                <span className="font-semibold">Mejor opción: </span>
                {step.answer.correctText}
              </p>
            )}
            <p className="mt-3 border-t border-black/5 pt-3 text-sm font-semibold text-ink-soft">{step.answer.takeaway}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!step.answer ? (
            <>
              <Button variant="ghost" onClick={hint} disabled={busy !== null || step.hintsShown.length >= step.hintsAvailable}>
                <Lightbulb className="size-4" aria-hidden />
                {step.hintsShown.length >= step.hintsAvailable ? "No hay más pistas" : "Pedir una pista"}
              </Button>
              <Button size="lg" onClick={decide} disabled={!selected || busy !== null}>
                {busy === "decision" && <Loader2 className="size-5 animate-spin" aria-hidden />}
                Confirmar decisión
              </Button>
            </>
          ) : allAnswered ? (
            <Button size="lg" className="sm:ml-auto" onClick={finish} disabled={busy !== null}>
              {busy === "complete" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
              {busy === "complete" ? "Incorporando a tu mapa de aprendizaje…" : "Ver qué aprendimos"}
            </Button>
          ) : (
            <Button size="lg" className="sm:ml-auto" onClick={next}>
              Siguiente situación <ArrowRight className="size-5" aria-hidden />
            </Button>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-error-600">{error}</p>}
      </article>
    </div>
  );
}

function Header({ view, answered }: { view: PlayerView; answered: number }) {
  return (
    <header>
      <p className="text-sm font-medium text-ink-muted">
        {view.subjectName} · {view.capabilityLabel}
      </p>
      <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight sm:text-2xl">{view.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
        <Clock className="size-4" aria-hidden /> {view.estimatedMinutes} min · {answered}/{view.steps.length} respondidas
        {view.launchId && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Actividad de tu docente</span>}
      </p>
    </header>
  );
}

/** S-32 Feedback inmediato post-acción: Fortaleciste · Conviene revisar · Siguiente paso. */
function ResultView({ result, title }: { result: Feedback; title: string }) {
  return (
    <div className="rise space-y-5">
      <header>
        <p className="text-sm font-medium text-ink-muted">Terminaste</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Resolviste bien {result.correct} de {result.total} situaciones{result.hintsUsed > 0 ? ` · usaste ${result.hintsUsed} ${result.hintsUsed === 1 ? "pista" : "pistas"}` : ""}.
        </p>
      </header>

      {result.transitions.map((t) => (
        <div key={t.capabilityId} className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-ink-muted">{t.label}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AcademicStateBadge state={t.from} />
            <ArrowRight className="size-4 text-ink-muted" aria-label="pasó a" />
            <AcademicStateBadge state={t.to} />
          </div>
          {t.from === t.to && <p className="mt-2 text-sm text-ink-muted">Tu estado no cambió con esta actividad.</p>}
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-solid-600/20 bg-solid-50 p-5" aria-labelledby="fortaleciste">
          <h2 id="fortaleciste" className="flex items-center gap-2 font-semibold text-solid-700">
            <CheckCircle2 className="size-5" aria-hidden /> Fortaleciste
          </h2>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {result.strengthened.length ? result.strengthened.map((s) => <li key={s}>{s}</li>) : <li>Esta vez no apareció una señal positiva clara. Está bien: también es información útil.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-attention-600/20 bg-attention-50 p-5" aria-labelledby="revisar">
          <h2 id="revisar" className="flex items-center gap-2 font-semibold text-attention-700">
            <Lightbulb className="size-5" aria-hidden /> Conviene revisar
          </h2>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {result.toReview.length ? result.toReview.map((s) => <li key={s}>{s}</li>) : <li>No apareció ninguna confusión en esta actividad.</li>}
          </ul>
        </section>
      </div>
      {result.insufficientNote && <p className="rounded-md bg-unknown-50 px-4 py-3 text-sm text-ink-soft">{result.insufficientNote}</p>}

      {result.next && (
        <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-5 text-white shadow-[var(--shadow-raised)]" aria-labelledby="siguiente">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/75">Siguiente paso</p>
          <h2 id="siguiente" className="mt-2 text-xl font-bold">
            {result.next.title}
          </h2>
          <p className="mt-1 text-[15px] text-white/85">{result.next.reason}</p>
          <p className="mt-2 text-sm text-white/75">
            {result.next.minutes} min · {result.next.subjectName}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <LinkButton href={`/estudiante/recomendaciones/${result.next.recommendationId}/empezar`} variant="inverse">
              Seguir <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
            <Link href="/estudiante" className="inline-flex h-11 items-center justify-center rounded-md px-4 text-[15px] font-semibold text-white/90 hover:bg-white/10">
              Volver al inicio
            </Link>
          </div>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/estudiante/materias" variant="secondary">
          Ver detalle en la materia
        </LinkButton>
        {!result.launchId && (
          <LinkButton href="/estudiante" variant="ghost">
            <RotateCcw className="size-4" aria-hidden /> Intentar de nuevo más tarde
          </LinkButton>
        )}
      </div>
    </div>
  );
}
