"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { Button, Card } from "@/ui/primitives";

const STAGES = ["Leyendo el programa…", "Identificando unidades y temas…", "Proponiendo capacidades observables…"];

/** T-01/T-02 Wizard: información básica + programa/materiales. */
export function CreateSectionForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<"file" | "paste" | "sample">("file");
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1200);
    if (mode === "sample") form.set("useSample", "on");
    try {
      const r = await fetch("/api/v1/teacher/course-sections/new", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message ?? "No pudimos crear la cátedra.");
      router.push(`/docente/catedras/nueva?seccion=${data.sectionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear la cátedra.");
      setBusy(false);
    } finally {
      clearInterval(t);
    }
  }

  const input = "h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[15px]";
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }}
    >
      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-ink-soft">1. Información básica</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Materia</span>
            <input name="subjectName" required minLength={3} placeholder="Ej.: Gestión Ágil de Proyectos" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Comisión</span>
            <input name="sectionName" placeholder="Comisión A" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Período</span>
            <input name="term" placeholder="2° cuatrimestre 2026" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Cantidad de clases</span>
            <input name="classes" type="number" min={4} max={30} defaultValue={12} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Estudiantes (aprox.)</span>
            <input name="approxStudents" type="number" min={1} max={500} defaultValue={35} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Fecha del 1° parcial (opcional)</span>
            <input name="examDate" type="date" className={input} />
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold text-ink-soft">2. Programa</p>
        <div className="inline-flex flex-wrap rounded-lg border border-line p-1 text-sm">
          {[
            { k: "file", label: "Subir PDF, TXT o MD" },
            { k: "paste", label: "Pegar texto" },
            { k: "sample", label: "Usar programa de ejemplo" },
          ].map((m) => (
            <button key={m.k} type="button" onClick={() => setMode(m.k as typeof mode)} className={`rounded-md px-3 py-1.5 font-semibold ${mode === m.k ? "bg-brand-600 text-white" : "text-ink-soft"}`}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === "file" && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-4 py-8 text-center hover:border-brand-200">
            <FileText className="size-6 text-ink-muted" aria-hidden />
            <span className="text-[15px] font-semibold">Elegí el programa de la materia</span>
            <span className="text-sm text-ink-muted">PDF, TXT o MD · hasta 8 MB</span>
            <input name="program" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" required className="text-sm" />
          </label>
        )}
        {mode === "paste" && <textarea name="programText" rows={10} required placeholder={"Unidad 1: …\n- Tema\n- Tema"} className="w-full rounded-md border border-line-strong p-3 text-[15px]" />}
        {mode === "sample" && <p className="rounded-md bg-canvas p-3 text-sm text-ink-soft">Usamos un programa breve de “Gestión Ágil de Proyectos” con tres unidades.</p>}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {busy ? STAGES[stage] : "Continuar"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-error-600">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
