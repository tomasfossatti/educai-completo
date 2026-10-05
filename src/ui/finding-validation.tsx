"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "./primitives";

const OPTIONS = [
  { v: "agree", label: "Sí" },
  { v: "partially_agree", label: "Parcialmente" },
  { v: "disagree", label: "No" },
  { v: "not_sure", label: "Todavía no sé" },
] as const;

/** Validación docente opcional (T-11): alimenta métricas de calidad, no cambia estados. */
export function FindingValidation({ findingId, sectionId, initial }: { findingId: string; sectionId: string; initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <p className="text-[15px] font-semibold">¿Coincide con lo que ves en clase?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Button
            key={o.v}
            size="sm"
            variant={value === o.v ? "primary" : "secondary"}
            disabled={busy}
            aria-pressed={value === o.v}
            onClick={async () => {
              setBusy(true);
              const r = await fetch(`/api/v1/teacher/findings/${findingId}/validate`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sectionId, validation: o.v }),
              });
              setBusy(false);
              if (r.ok) setValue(o.v);
            }}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {value && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-solid-700">
          <CheckCircle2 className="size-4" aria-hidden /> Gracias. Tu validación nos ayuda a calibrar el motor; no cambia los estados de tus estudiantes.
        </p>
      )}
    </div>
  );
}
