"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCopy, FileUp, Loader2 } from "lucide-react";
import { Button, Card } from "@/ui/primitives";

const EXPORT_PROMPT =
  "Exportá toda esta conversación en un archivo Markdown, respetando el orden completo de los mensajes e indicando claramente cuáles son míos y cuáles son tuyos. No resumas, elimines ni reescribas ninguna intervención.";

/** S-31 Paso 1 y 2: instrucciones para exportar + subida con estados uploading/parsing. */
export function TranscriptUploader({ sectionId }: { sectionId: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "parsing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"file" | "paste">("file");

  async function submit(form: FormData) {
    setError(null);
    setState("uploading");
    form.set("sectionId", sectionId);
    try {
      setTimeout(() => setState((s) => (s === "uploading" ? "parsing" : s)), 500);
      const r = await fetch("/api/v1/uploads/transcript", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message ?? "No pudimos procesar el archivo.");
      router.push(`/estudiante/subidas/${data.uploadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos procesar el archivo.");
      setState("idle");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-sm font-semibold text-ink-soft">1. Pedile a la otra IA que exporte la conversación</p>
        <blockquote className="mt-2 rounded-md bg-canvas p-3 text-[15px] leading-relaxed">{EXPORT_PROMPT}</blockquote>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={async () => {
            await navigator.clipboard?.writeText(EXPORT_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <CheckCircle2 className="size-4" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />}
          {copied ? "Copiado" : "Copiar texto"}
        </Button>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-ink-soft">2. Subí el archivo</p>
        <div className="mt-3 inline-flex rounded-lg border border-line p-1 text-sm">
          <button type="button" onClick={() => setMode("file")} className={`rounded-md px-3 py-1.5 font-semibold ${mode === "file" ? "bg-brand-600 text-white" : "text-ink-soft"}`}>
            Archivo TXT o MD
          </button>
          <button type="button" onClick={() => setMode("paste")} className={`rounded-md px-3 py-1.5 font-semibold ${mode === "paste" ? "bg-brand-600 text-white" : "text-ink-soft"}`}>
            Pegar texto
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(new FormData(e.currentTarget));
          }}
        >
          {mode === "file" ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-4 py-8 text-center hover:border-brand-200">
              <FileUp className="size-6 text-ink-muted" aria-hidden />
              <span className="text-[15px] font-semibold">Elegí el archivo exportado</span>
              <span className="text-sm text-ink-muted">.txt o .md · hasta 300 KB</span>
              <input name="file" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" required className="text-sm" />
            </label>
          ) : (
            <textarea name="text" rows={8} required placeholder={"Usuario: …\nChatGPT: …"} className="w-full rounded-md border border-line-strong p-3 text-[15px]" />
          )}
          <Button type="submit" disabled={state !== "idle"}>
            {state !== "idle" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {state === "uploading" ? "Subiendo…" : state === "parsing" ? "Leyendo la conversación…" : "Subir conversación"}
          </Button>
          {error && (
            <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">
              {error}
            </p>
          )}
        </form>
        <p className="mt-4 text-sm text-ink-muted">
          ¿Querés probar? Descargá una{" "}
          <a href="/demo/conversacion-retrospectiva.md" download className="font-semibold text-brand-700 hover:underline">
            conversación de ejemplo
          </a>{" "}
          y subila.
        </p>
      </Card>
    </div>
  );
}
