import { ArrowRight, Radio } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { listSectionExperiences } from "@/modules/experience/service";
import { Card, Pill } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Experiencias" };

const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Cordoba" });

export default async function ExperiencesPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  const list = await listSectionExperiences(db, user.id, sectionId);
  const base = `/docente/c/${sectionId}`;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Experiencias de la cátedra</h2>
        <p className="text-[15px] text-ink-soft">Las que generaste y las que ya usaste con tu aula.</p>
      </div>
      {list.length === 0 && <EmptyState title="Todavía no hay experiencias.">Generá una desde un hallazgo en el Inicio.</EmptyState>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map(({ def, launches }) => {
          const open = launches.find((l) => l.status === "open");
          const last = launches.sort((a, b) => b.opensAt.getTime() - a.opensAt.getTime())[0];
          return (
            <Card key={def.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{def.title}</h3>
                {open ? <Pill tone="brand" icon={<Radio className="size-3" aria-hidden />}>Abierta</Pill> : last ? <Pill tone="neutral">Usada {fmt(last.opensAt)}</Pill> : <Pill tone="solid">Lista</Pill>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {def.definition.steps.length} situaciones · {def.definition.estimatedMinutes} min
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                {open && (
                  <a href={`${base}/lanzamientos/${open.id}`} className="text-brand-700 hover:underline">
                    Ver en vivo
                  </a>
                )}
                {!open && last && (
                  <a href={`${base}/lanzamientos/${last.id}`} className="text-brand-700 hover:underline">
                    Qué observamos
                  </a>
                )}
                <a href={`${base}/experiencias/${def.id}`} className="inline-flex items-center gap-1 text-ink-soft hover:text-brand-700">
                  Ver experiencia <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
