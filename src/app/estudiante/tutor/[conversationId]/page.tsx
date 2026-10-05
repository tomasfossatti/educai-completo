import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getConversationView } from "@/modules/tutor/service";
import { DomainError } from "@/modules/shared/errors";
import { aiEnabled } from "@/modules/ai-gateway/gateway";
import { TutorChat } from "./chat";

export const metadata = { title: "Tutor" };

/** S-30 IA integrada: header contextual y modos aprendizaje/evidencia invisibles para el estudiante. */
export default async function TutorPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  let v;
  try {
    v = await getConversationView(db, user.id, conversationId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  return (
    <div className="space-y-4">
      <a href={`/estudiante/materias/${v.sectionId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Volver a la materia
      </a>
      <header className="rounded-2xl border border-line bg-surface px-4 py-3">
        <p className="text-sm font-semibold">
          {v.subjectName} · {v.capability?.label}
        </p>
        <p className="text-sm text-ink-muted">Objetivo: {v.capability?.statement}</p>
        {!aiEnabled() && <p className="mt-1 text-xs text-ink-muted">Modo sin IA generativa: el tutor usa explicaciones preparadas para esta cátedra.</p>}
      </header>
      <TutorChat
        conversationId={v.id}
        sectionId={v.sectionId}
        initialPhase={v.phase}
        initialMessages={v.messages.map((m) => ({ ...m, meta: (m.meta ?? {}) as Record<string, unknown> }))}
      />
    </div>
  );
}
