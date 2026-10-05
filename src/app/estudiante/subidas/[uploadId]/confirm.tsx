"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import type { ImportResult } from "@/modules/sources/import";
import { AcademicStateBadge } from "@/ui/academic";
import { Button, Card, LinkButton } from "@/ui/primitives";

/** S-31 Paso 3: confirmar y ver el resultado. */
export function ConfirmImport({
  uploadId,
  initialResult,
  otherSections,
  canConfirm,
}: {
  uploadId: string;
  initialResult: ImportResult | null;
  otherSections: { sectionId: string; subjectName: string }[];
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(initialResult);
  const [error, setError] = useState<string | null>(null);

  if (result) {
    return (
      <Card className="rise space-y-4 p-5">
        <p className="flex items-center gap-2 font-semibold text-solid-700">
          <CheckCircle2 className="size-5" aria-hidden /> Listo. Usamos {result.evidenceCount} {result.evidenceCount === 1 ? "explicación tuya" : "explicaciones tuyas"} como evidencia.
        </p>
        {result.skippedQuestions > 0 && <p className="text-sm text-ink-soft">Tus preguntas no cuentan como evidencia: muestran qué querías saber, no qué podés hacer.</p>}
        {result.transitions.map((t) => (
          <div key={t.capabilityId}>
            <p className="text-sm font-semibold text-ink-muted">{t.label}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AcademicStateBadge state={t.from} />
              <ArrowRight className="size-4 text-ink-muted" aria-label="pasó a" />
              <AcademicStateBadge state={t.to} />
            </div>
          </div>
        ))}
        {result.transitions.length === 0 && <p className="text-sm text-ink-soft">La evidencia quedó registrada, pero todavía no alcanza para cambiar un estado.</p>}
        <p className="text-sm text-ink-muted">Como la conversación la subiste vos, pesa un poco menos que lo que observamos directamente en Educai.</p>
        {result.next && (
          <LinkButton href={`/estudiante/recomendaciones/${result.next.id}/empezar`}>
            Siguiente paso: {result.next.title} <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {otherSections.length > 0 && (
        <Card className="p-4">
          <p className="text-[15px]">La conversación parece de otra materia. ¿Querés asignarla a otra?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherSections.map((s) => (
              <Button
                key={s.sectionId}
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await fetch(`/api/v1/uploads/${uploadId}/section`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sectionId: s.sectionId }) });
                  router.refresh();
                }}
              >
                Usarla en {s.subjectName}
              </Button>
            ))}
          </div>
        </Card>
      )}
      <Button
        size="lg"
        disabled={busy || !canConfirm}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await fetch(`/api/v1/uploads/${uploadId}/confirm`, { method: "POST" });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error?.message);
            setResult(data as ImportResult);
          } catch (e) {
            setError(e instanceof Error && e.message ? e.message : "No pudimos procesarla. La conversación quedó guardada; probá de nuevo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {busy ? "Procesando evidencia…" : "Usar como evidencia"}
      </Button>
      {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
    </div>
  );
}
