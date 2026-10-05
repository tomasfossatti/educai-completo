import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, Lock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { VisibleState } from "@/modules/shared/enums";
import { cx } from "./primitives";

/** AcademicStateBadge (UX §46): siempre con ícono + texto, nunca solo color. */
export const STATE_META: Record<VisibleState, { label: string; tone: string; icon: ReactNode; dot: string }> = {
  solid: { label: "Evidencia sólida", tone: "bg-solid-50 text-solid-700 border-solid-600/20", icon: <CheckCircle2 className="size-4" aria-hidden />, dot: "bg-solid-600" },
  in_development: { label: "En desarrollo", tone: "bg-developing-50 text-developing-700 border-developing-600/20", icon: <CircleDashed className="size-4" aria-hidden />, dot: "bg-developing-600" },
  needs_review: { label: "Conviene revisar", tone: "bg-attention-50 text-attention-700 border-attention-600/25", icon: <AlertTriangle className="size-4" aria-hidden />, dot: "bg-attention-600" },
  unknown: { label: "Todavía no sabemos", tone: "bg-unknown-50 text-unknown-600 border-unknown-600/15", icon: <HelpCircle className="size-4" aria-hidden />, dot: "bg-unknown-600" },
};

export function AcademicStateBadge({ state, size = "md" }: { state: VisibleState; size?: "sm" | "md" }) {
  const m = STATE_META[state];
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold", m.tone, size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]")}>
      {m.icon}
      {m.label}
    </span>
  );
}

/** EvidenceCoverage: muestra n/N y su significado. */
export function CoverageIndicator({ n, N, label, className }: { n: number; N: number; label?: string; className?: string }) {
  const pct = N > 0 ? Math.round((n / N) * 100) : 0;
  return (
    <div className={cx("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs text-ink-muted">
        <span>{label ?? "Con evidencia suficiente"}</span>
        <span className="font-semibold tabular-nums text-ink-soft">
          {n}/{N}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-unknown-50" role="img" aria-label={`${n} de ${N} estudiantes con evidencia suficiente`}>
        <div className="h-full rounded-full bg-ink-soft/50" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TrendMark({ trend }: { trend: "improving" | "stable" | "worsening" | "unknown" }) {
  if (trend === "unknown") return <span className="text-xs text-ink-muted">Sin comparación</span>;
  const m = {
    improving: { icon: <TrendingDown className="size-4" aria-hidden />, label: "Mejora", cls: "text-solid-700" },
    worsening: { icon: <TrendingUp className="size-4" aria-hidden />, label: "Empeora", cls: "text-attention-700" },
    stable: { icon: <Minus className="size-4" aria-hidden />, label: "Estable", cls: "text-ink-muted" },
  }[trend];
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", m.cls)}>
      {m.icon}
      {m.label}
    </span>
  );
}

/** PrivacyNotice: small-cell suppression y anonimato explicado al docente. */
export function PrivacyNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-unknown-50 px-3 py-2 text-[13px] leading-snug text-ink-soft">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children ?? "No mostramos este desglose porque hay muy pocos estudiantes para preservar privacidad."}</span>
    </p>
  );
}

const JOURNEY = [
  { key: "understand", label: "Comprender", levels: ["recognize", "explain"] },
  { key: "apply", label: "Aplicar", levels: ["apply"] },
  { key: "solve", label: "Resolver", levels: ["solve"] },
  { key: "transfer", label: "Transferir", levels: ["transfer"] },
] as const;

/** ProgressStepper: Comprender ✓ Aplicar ✓ Resolver ● Transferir ○ */
export function JourneyStepper({ done, current }: { done: string[]; current: string | null }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Tu recorrido">
      {JOURNEY.map((j) => {
        const isDone = done.includes(j.key);
        const isCurrent = current === j.key;
        return (
          <li key={j.key} className="min-w-0">
            <div className={cx("h-1.5 rounded-full", isDone ? "bg-solid-600" : isCurrent ? "bg-brand-500" : "bg-line")} />
            <p className={cx("mt-1.5 text-[11px] font-semibold leading-tight sm:text-xs", isDone ? "text-solid-700" : isCurrent ? "text-brand-700" : "text-ink-muted")}>
              {isDone ? "✓ " : isCurrent ? "● " : "○ "}
              {j.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function journeyFrom(levels: { target: string; state: VisibleState }[]) {
  const stageOf = (lvl: string) => JOURNEY.find((j) => (j.levels as readonly string[]).includes(lvl))?.key ?? "apply";
  const stages = JOURNEY.map((j) => j.key);
  const done: string[] = [];
  let current: string | null = null;
  for (const st of stages) {
    const caps = levels.filter((l) => stageOf(l.target) === st);
    if (caps.length === 0) continue;
    if (caps.every((c) => c.state === "solid")) done.push(st);
    else if (!current) current = st;
  }
  return { done, current };
}

export const LEVEL_LABEL: Record<string, string> = {
  recognize: "Reconocer",
  explain: "Explicar",
  apply: "Aplicar",
  solve: "Resolver",
  transfer: "Transferir",
};
