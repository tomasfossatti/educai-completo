import { ArrowRight, Clock, Megaphone, PlayCircle } from "lucide-react";
import type { HomeRecommendation } from "@/modules/recommendation/service";
import { LinkButton, Pill, cx } from "./primitives";
import { WhySheet } from "./why-sheet";

export const startHref = (id: string) => `/estudiante/recomendaciones/${id}/empezar`;

/** RecommendationCard dominante: título · razón corta · duración · materia · [Empezar] · ¿Por qué? */
export function NextStepCard({ rec, showSubject = true }: { rec: HomeRecommendation; showSubject?: boolean }) {
  const teacher = rec.priorityClass === "teacher_required";
  return (
    <section
      aria-labelledby="next-step"
      className={cx(
        "rise relative overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-raised)] sm:p-6",
        teacher ? "bg-gradient-to-br from-[#2d2a8f] to-brand-600" : "bg-gradient-to-br from-brand-700 to-brand-500",
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/75">Tu próximo paso</p>
      {teacher && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
          <Megaphone className="size-3.5" aria-hidden /> Actividad de tu docente
        </span>
      )}
      <h1 id="next-step" className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-[26px]">
        {rec.title}
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/85">{rec.explanation.short}</p>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-white/75">
        <Clock className="size-4" aria-hidden /> {rec.actionSpec.estimatedMinutes} min{showSubject && ` · ${rec.subjectName}`}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <LinkButton href={startHref(rec.id)} size="lg" variant="inverse" className="sm:min-w-44">
          <PlayCircle className="size-5" aria-hidden /> {rec.actionSpec.ctaLabel || "Empezar"}
        </LinkButton>
        <WhySheet recommendationId={rec.id} explanation={rec.explanation} triggerClassName="text-white/90 hover:text-white" />
      </div>
    </section>
  );
}

export function PendingItem({ rec }: { rec: HomeRecommendation }) {
  return (
    <a
      href={startHref(rec.id)}
      className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-brand-200"
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block font-semibold leading-snug">{rec.title}</span>
        <span className="block truncate text-sm text-ink-muted">
          {rec.actionSpec.estimatedMinutes} min · {rec.subjectName}
        </span>
      </span>
      {rec.priorityClass === "teacher_required" && <Pill tone="brand">Docente</Pill>}
      <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
    </a>
  );
}
