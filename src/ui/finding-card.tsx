import { ArrowRight, CalendarClock, GitBranch, Layers, SearchCheck } from "lucide-react";
import type { FindingCardDTO } from "@/modules/teacher-projection/dto";
import { CoverageIndicator } from "./academic";
import { cx } from "./primitives";

const REASON_CHIP: Record<string, { label: string; icon: React.ReactNode }> = {
  CLASS_ASSESSMENT_NEAR: { label: "Antes del parcial", icon: <CalendarClock className="size-3.5" aria-hidden /> },
  CLASS_COGNITIVE_GAP: { label: "Explican bien, aplican con dificultad", icon: <Layers className="size-3.5" aria-hidden /> },
  CLASS_PREREQUISITE_RISK: { label: "Base de lo que viene", icon: <GitBranch className="size-3.5" aria-hidden /> },
  CLASS_NEGATIVE_TREND: { label: "Empeoró", icon: null },
};

/** FindingCard: prioridad → evidencia (n/N) → decisión. */
export function FindingCard({ f, href, primary }: { f: FindingCardDTO; href: string; primary?: boolean }) {
  const low = f.type === "low_coverage";
  return (
    <article className={cx("rounded-lg border bg-surface p-5 shadow-[var(--shadow-card)]", primary ? "border-attention-600/30" : "border-line")}>
      <div className="flex items-start gap-4">
        {!low && f.rate !== null && (
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-attention-50 text-attention-700" aria-hidden>
            <span className="text-2xl font-bold tabular-nums">{Math.round(f.rate * 100)}%</span>
          </div>
        )}
        {low && (
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-unknown-50 text-unknown-600" aria-hidden>
            <SearchCheck className="size-7" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug">{f.headline}</h3>
          <p className="mt-1 text-[15px] text-ink-soft">{f.detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-3">
          {low ? (
            <CoverageIndicator n={f.numerator} N={f.enrolled} label="Estudiantes con evidencia suficiente" />
          ) : (
            <p className="text-sm text-ink-soft">
              <span className="font-semibold tabular-nums text-ink">
                {f.numerator} de {f.denominator}
              </span>{" "}
              estudiantes con evidencia suficiente necesitan revisar · {f.enrolled} inscriptos
            </p>
          )}
          {f.reasonCodes.some((r) => REASON_CHIP[r]) && (
            <ul className="flex flex-wrap gap-1.5">
              {f.reasonCodes
                .filter((r) => REASON_CHIP[r])
                .map((r) => (
                  <li key={r} className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft">
                    {REASON_CHIP[r].icon}
                    {REASON_CHIP[r].label}
                  </li>
                ))}
            </ul>
          )}
        </div>
        <a href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          ¿Por qué Educai detectó esto? <ArrowRight className="size-4" aria-hidden />
        </a>
      </div>
    </article>
  );
}
