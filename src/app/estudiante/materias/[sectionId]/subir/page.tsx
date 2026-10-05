import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { assertEnrolled, getSection } from "@/modules/academic/service";
import { DomainError } from "@/modules/shared/errors";
import { track } from "@/modules/shared/outbox";
import { TranscriptUploader } from "./uploader";

export const metadata = { title: "Subir conversación" };

/** S-31 Subir conversación externa. */
export default async function UploadPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  try {
    await assertEnrolled(db, user.id, sectionId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  const { subject } = await getSection(db, sectionId);
  await track(db, "external_transcript_started", { userId: user.id, courseSectionId: sectionId });
  return (
    <div className="space-y-5">
      <a href={`/estudiante/materias/${sectionId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> {subject.name}
      </a>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">¿Estudiaste esto con otra IA?</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Subí la conversación y la usamos como evidencia de lo que explicaste vos. Las respuestas de la IA no cuentan como tu aprendizaje.
        </p>
      </header>
      <TranscriptUploader sectionId={sectionId} />
      <p className="flex items-start gap-2 text-xs text-ink-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Tu docente no ve la conversación. Podés eliminarla cuando quieras desde Mi perfil y recalculamos todo lo que dependía de ella.
      </p>
    </div>
  );
}
