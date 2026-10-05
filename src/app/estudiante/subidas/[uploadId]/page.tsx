import { notFound } from "next/navigation";
import { ArrowLeft, Bot, UserRound } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getUploadSummary } from "@/modules/sources/import";
import { DomainError } from "@/modules/shared/errors";
import { Card, Pill } from "@/ui/primitives";
import { ConfirmImport } from "./confirm";

export const metadata = { title: "Confirmar conversación" };

/** S-31 Paso 3: conversación detectada, roles, materia y temas probables. */
export default async function UploadSummaryPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  let s;
  try {
    s = await getUploadSummary(db, user.id, uploadId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  return (
    <div className="space-y-5">
      <a href={`/estudiante/materias/${s.sectionId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> {s.subjectName}
      </a>
      <h1 className="text-2xl font-bold tracking-tight">Revisá antes de usarla</h1>
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Conversación">{s.provider === "otra IA" ? "Otra IA" : s.provider === "chatgpt" ? "ChatGPT" : "Claude"}</Fact>
          <Fact label="Tus mensajes">{s.studentTurns}</Fact>
          <Fact label="De la IA">{s.assistantTurns}</Fact>
          <Fact label="Materia">{s.subjectName}</Fact>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Temas probables</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.topics.length ? s.topics.map((t) => <Pill key={t.id} tone="brand">{t.label}</Pill>) : <span className="text-sm text-ink-muted">No reconocimos temas de esta materia.</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Así detectamos los roles</p>
          <ol className="mt-2 space-y-2">
            {s.preview.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm">
                {m.role === "student" ? <UserRound className="mt-0.5 size-4 shrink-0 text-brand-600" aria-label="Vos" /> : <Bot className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-label="IA" />}
                <span className={m.role === "student" ? "text-ink" : "text-ink-muted"}>{m.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <ConfirmImport uploadId={s.id} initialResult={s.result} otherSections={s.otherSections} canConfirm={s.status === "needs_confirmation"} />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-canvas px-3 py-2">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-semibold">{children}</p>
    </div>
  );
}
