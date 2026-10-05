import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getDraft } from "@/modules/curriculum/setup";
import { Eyebrow } from "@/ui/primitives";
import { ErrorNotice } from "@/ui/states";
import { CreateSectionForm } from "./create-form";
import { CurriculumEditor } from "./curriculum-editor";

export const metadata = { title: "Configurar cátedra" };

/** T-01 Setup cátedra → T-02 Materiales → T-03 "Así entendimos tu materia". */
export default async function NewSectionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireTeacher();
  const db = await getDb();
  const draft = sp.seccion ? await getDraft(db, user.id, sp.seccion).catch(() => null) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <a href="/docente" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Mis cátedras
      </a>
      {sp.seccion && !draft ? (
        <div className="mt-6">
          <ErrorNotice title="No encontramos una propuesta pendiente para esta cátedra.">Puede que ya esté activa: volvé a Mis cátedras.</ErrorNotice>
        </div>
      ) : draft ? (
        <div className="mt-4 space-y-5">
          <header>
            <Eyebrow>Paso 3 de 3</Eyebrow>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Así entendimos tu materia</h1>
            <p className="mt-1 text-[15px] text-ink-soft">
              Revisá unidades, temas y capacidades. Podés renombrar, agregar, eliminar y cambiar el nivel esperado de cada capacidad.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="size-3.5" aria-hidden />
              {draft.extractor === "llm" ? "Propuesta generada con IA a partir del programa" : "Propuesta inicial armada a partir de la estructura del programa"}
            </p>
            {draft.material?.warning && (
              <p className="mt-2 flex items-center gap-2 text-sm text-attention-700">
                <AlertTriangle className="size-4" aria-hidden /> {draft.material.warning}
              </p>
            )}
          </header>
          <CurriculumEditor sectionId={sp.seccion!} initial={draft.draft} />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <header>
            <Eyebrow>Pasos 1 y 2 de 3</Eyebrow>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Configurar cátedra</h1>
            <p className="mt-1 text-[15px] text-ink-soft">Cargá el programa y Educai te propone un mapa de temas y capacidades para validar.</p>
          </header>
          <CreateSectionForm />
        </div>
      )}
    </main>
  );
}
