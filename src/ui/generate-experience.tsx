"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Wand2 } from "lucide-react";
import { Button, cx } from "./primitives";

const STAGES = ["Diseñando la secuencia…", "Preparando la interacción…", "Verificando evidencia…", "Probando la experiencia…"];

/** T-60 Generación de experiencia con progreso visible y fallback. */
export function GenerateExperienceButton({
  sectionId,
  findingId,
  variant = 0,
  label = "Generar experiencia",
  buttonVariant = "primary",
  full,
}: {
  sectionId: string;
  findingId: string;
  variant?: number;
  label?: string;
  buttonVariant?: "primary" | "secondary";
  full?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 900);
    return () => clearInterval(t);
  }, [busy]);

  async function go() {
    setBusy(true);
    setStage(0);
    setError(null);
    try {
      const r = await fetch(`/api/v1/teacher/course-sections/${sectionId}/experiences/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ findingId, variant }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message ?? "No pudimos generar la experiencia.");
      router.push(`/docente/c/${sectionId}/experiencias/${data.definitionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos generar la experiencia.");
      setBusy(false);
    }
  }

  return (
    <div className={cx(full && "w-full")}>
      <Button onClick={go} disabled={busy} variant={buttonVariant} full={full}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
        {busy ? "Generando…" : label}
      </Button>
      {busy && (
        <ol className="mt-3 space-y-1.5 text-sm" aria-live="polite">
          {STAGES.map((s, i) => (
            <li key={s} className={cx("flex items-center gap-2", i < stage ? "text-solid-700" : i === stage ? "font-semibold text-ink" : "text-ink-muted")}>
              {i < stage ? <CheckCircle2 className="size-4" aria-hidden /> : i === stage ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <span className="size-4" />}
              {s}
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">
          {error}
        </p>
      )}
    </div>
  );
}
