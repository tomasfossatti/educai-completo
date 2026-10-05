"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/ui/primitives";

/** Borrado de fuente con explicación de consecuencias antes de confirmar (UX §24). */
export function DeleteSourceButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming)
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Eliminar ${title}`}>
        <Trash2 className="size-4" aria-hidden /> Eliminar
      </Button>
    );
  return (
    <div className="mt-2 basis-full rounded-md border border-error-600/20 bg-error-50 p-3 text-sm">
      <p>Si eliminás esta conversación, Educai dejará de utilizarla y volverá a calcular los estados que dependían de ella.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const r = await fetch(`/api/v1/me/data-sources/${id}`, { method: "DELETE" });
            setBusy(false);
            if (!r.ok) {
              setError("No pudimos eliminarla. No se borró nada; probá de nuevo.");
              return;
            }
            router.refresh();
          }}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Eliminar y recalcular
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
      {error && <p className="mt-2 text-error-600" role="alert">{error}</p>}
    </div>
  );
}
