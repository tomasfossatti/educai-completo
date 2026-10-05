"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Rocket, Smartphone, XCircle } from "lucide-react";
import type { DecisionScenarioDefinition } from "@/modules/experience/contract";
import type { QualityReview } from "@/db/schema/engines";
import { Button, Card, Eyebrow, cx } from "@/ui/primitives";
import { GenerateExperienceButton } from "@/ui/generate-experience";

/** T-61 Preview: Vista estudiante / Configuración, sin JSON a la vista. */
export function ExperiencePreview({
  sectionId,
  definitionId,
  findingId,
  def,
  review,
  status,
  source,
  capabilityLabel,
  errorLabels,
  openLaunchId,
  nextVariant,
}: {
  sectionId: string;
  definitionId: string;
  findingId: string | null;
  def: DecisionScenarioDefinition;
  review: QualityReview;
  status: string;
  source: string;
  capabilityLabel: string;
  errorLabels: Record<string, string>;
  openLaunchId: string | null;
  nextVariant: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"student" | "config">("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/teacher/experiences/${definitionId}/launch`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message);
      router.push(`/docente/c/${sectionId}/lanzamientos/${data.launchId}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No pudimos lanzar la experiencia.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div role="tablist" aria-label="Modo de vista" className="mb-4 inline-flex rounded-lg border border-line bg-surface p-1">
          {[
            { k: "student", label: "Vista estudiante" },
            { k: "config", label: "Configuración" },
          ].map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => setTab(t.k as "student" | "config")}
              className={cx("rounded-md px-4 py-2 text-sm font-semibold", tab === t.k ? "bg-brand-600 text-white" : "text-ink-soft hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "student" ? (
          <div className="space-y-4">
            <Card className="p-5">
              <Eyebrow>{def.context.organization}</Eyebrow>
              <p className="mt-2 text-[15px] leading-relaxed">{def.context.intro}</p>
            </Card>
            {def.steps.map((s, i) => (
              <Card key={s.id} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Situación {i + 1} de {def.steps.length}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{s.situation}</p>
                <p className="mt-3 font-semibold">{s.question}</p>
                <ul className="mt-3 space-y-2">
                  {s.options.map((o) => (
                    <li key={o.id} className={cx("rounded-md border px-3 py-2 text-[15px]", o.correct ? "border-solid-600/40 bg-solid-50" : "border-line")}>
                      <div className="flex items-start gap-2">
                        {o.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-solid-600" aria-label="Respuesta adecuada" /> : <span className="mt-0.5 size-4 shrink-0" />}
                        <span>{o.text}</span>
                      </div>
                      {!o.correct && o.errorKey && errorLabels[o.errorKey] && <p className="ml-6 mt-1 text-xs text-attention-700">Revela: {errorLabels[o.errorKey]}</p>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-soft">
                  <span className="font-semibold text-ink">Cierre de la situación: </span>
                  {s.takeaway}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="space-y-3 p-5 text-[15px]">
              <Row label="Objetivo">{def.learningObjective}</Row>
              <Row label="Duración">{def.estimatedMinutes} minutos · individual</Row>
              <Row label="Dispositivos">Celular o notebook (funciona con lector de pantalla y teclado)</Row>
              <Row label="Qué observará Educai">
                {def.steps.length} oportunidades independientes de “{capabilityLabel}”. Cada decisión queda como evidencia; las pistas bajan su peso y una respuesta repetida cuenta como práctica.
              </Row>
              <Row label="Feedback">Inmediato después de cada decisión, con la explicación de por qué.</Row>
              <Row label="Origen">{source === "llm" ? "Generada con IA a partir de la capacidad y los errores detectados" : source === "bank" ? "Armada desde el banco curado de situaciones de la cátedra" : "Actividad precargada"}</Row>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-semibold">Controles de calidad</p>
              <ul className="mt-3 space-y-2">
                {review.checks.map((c) => (
                  <li key={c.dimension} className="flex items-start gap-2 text-sm">
                    {c.result === "pass" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-solid-600" aria-label="Aprobado" />
                    ) : c.result === "warn" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-attention-600" aria-label="Advertencia" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-error-600" aria-label="No aprobado" />
                    )}
                    <span>
                      <span className="font-semibold capitalize">{c.dimension}: </span>
                      {c.message}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <Eyebrow>{status === "published" ? "Publicada" : "Lista para usar"}</Eyebrow>
          <h2 className="mt-2 text-lg font-semibold leading-snug">{def.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{def.description}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
            <Smartphone className="size-4" aria-hidden /> Tus estudiantes entran con QR, código o link.
          </p>
          <div className="mt-4 space-y-2">
            {openLaunchId ? (
              <Button full onClick={() => router.push(`/docente/c/${sectionId}/lanzamientos/${openLaunchId}`)}>
                Ver en vivo
              </Button>
            ) : (
              <Button full onClick={launch} disabled={busy || review.overall === "fail"}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Rocket className="size-4" aria-hidden />}
                Usar experiencia y lanzar
              </Button>
            )}
            {findingId && status !== "published" && <GenerateExperienceButton sectionId={sectionId} findingId={findingId} variant={nextVariant} label="Generar otra alternativa" buttonVariant="secondary" full />}
          </div>
          {review.overall === "fail" && <p className="mt-3 text-sm text-error-600">No pasó los controles de calidad: generá otra alternativa.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-error-600">{error}</p>}
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}
