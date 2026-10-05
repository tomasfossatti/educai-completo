"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import type { DraftCurriculum } from "@/modules/curriculum/extract";
import { COGNITIVE_LEVELS, type CognitiveLevel } from "@/modules/shared/enums";
import { LEVEL_LABEL } from "@/ui/academic";
import { Button, Card } from "@/ui/primitives";

/** T-03 "Así entendimos tu materia": árbol editable Unidad → Tema → Capacidad. */
export function CurriculumEditor({ sectionId, initial }: { sectionId: string; initial: DraftCurriculum }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftCurriculum>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (fn: (d: DraftCurriculum) => void) =>
    setDraft((d) => {
      const copy: DraftCurriculum = structuredClone(d);
      fn(copy);
      return copy;
    });

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/teacher/course-sections/${sectionId}/curriculum/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message);
      router.push(`/docente/c/${sectionId}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No pudimos activar la currícula.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-line focus:border-brand-500";
  return (
    <div className="space-y-4">
      {draft.units.map((u, ui) => (
        <Card key={ui} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-canvas px-3 py-2">
            <input aria-label="Nombre de la unidad" className={`${field} font-semibold`} value={u.title} onChange={(e) => update((d) => (d.units[ui].title = e.target.value))} />
            <button className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-error-50 hover:text-error-600" aria-label="Eliminar unidad" onClick={() => update((d) => d.units.splice(ui, 1))}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <div className="divide-y divide-line">
            {u.topics.map((t, ti) => (
              <div key={ti} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tema</span>
                  <input aria-label="Nombre del tema" className={`${field} text-[15px] font-semibold`} value={t.title} onChange={(e) => update((d) => (d.units[ui].topics[ti].title = e.target.value))} />
                  <button className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-error-50 hover:text-error-600" aria-label="Eliminar tema" onClick={() => update((d) => d.units[ui].topics.splice(ti, 1))}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                <ul className="ml-4 mt-1 space-y-1 border-l-2 border-brand-100 pl-3">
                  {t.capabilities.map((c, ci) => (
                    <li key={ci} className="flex flex-wrap items-center gap-2">
                      <input aria-label="Capacidad" className={`${field} min-w-0 flex-1 text-[15px]`} value={c.statement} onChange={(e) => update((d) => (d.units[ui].topics[ti].capabilities[ci].statement = e.target.value))} />
                      <select
                        aria-label="Nivel"
                        className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
                        value={c.level}
                        onChange={(e) => update((d) => (d.units[ui].topics[ti].capabilities[ci].level = e.target.value as CognitiveLevel))}
                      >
                        {COGNITIVE_LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABEL[l]}
                          </option>
                        ))}
                      </select>
                      <button className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-error-50 hover:text-error-600" aria-label="Eliminar capacidad" onClick={() => update((d) => d.units[ui].topics[ti].capabilities.splice(ci, 1))}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-brand-700 hover:underline"
                      onClick={() => update((d) => d.units[ui].topics[ti].capabilities.push({ statement: `Explicar ${t.title.toLowerCase()}`, shortLabel: t.title.slice(0, 48), level: "explain", keywords: [] }))}
                    >
                      <Plus className="size-3.5" aria-hidden /> Agregar capacidad
                    </button>
                  </li>
                </ul>
              </div>
            ))}
            <div className="px-3 py-2">
              <button className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline" onClick={() => update((d) => d.units[ui].topics.push({ title: "Nuevo tema", capabilities: [] }))}>
                <Plus className="size-3.5" aria-hidden /> Agregar tema
              </button>
            </div>
          </div>
        </Card>
      ))}
      <button className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline" onClick={() => update((d) => d.units.push({ title: `Unidad ${d.units.length + 1} · Nueva unidad`, topics: [] }))}>
        <Plus className="size-4" aria-hidden /> Agregar unidad
      </button>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button size="lg" onClick={activate} disabled={busy}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
          Está correcto, activar
        </Button>
        <p className="text-sm text-ink-muted">Activar crea la versión 1 de la currícula. Las capacidades se usan para interpretar la evidencia del aula.</p>
      </div>
      {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
    </div>
  );
}
