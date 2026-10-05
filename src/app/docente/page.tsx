import { ArrowRight, CalendarClock, Plus, Users } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getSectionOverview, listTeacherSections } from "@/modules/academic/service";
import { getActiveVersion } from "@/modules/curriculum/service";
import { Card, LinkButton, Pill } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Mis cátedras" };

/** T-00 Selector de materia/cátedra. */
export default async function TeacherSections() {
  const user = await requireTeacher();
  const db = await getDb();
  const rows = await listTeacherSections(db, user.id);
  const cards = await Promise.all(
    rows.map(async (r) => {
      const o = await getSectionOverview(db, r.section.id);
      const v = await getActiveVersion(db, r.section.id);
      return { ...r, o, setup: v ? "active" : "setup_required" };
    }),
  );
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis cátedras</h1>
          <p className="text-[15px] text-ink-soft">Elegí una cátedra para ver qué necesita tu aula.</p>
        </div>
        <LinkButton href="/docente/catedras/nueva" variant="secondary">
          <Plus className="size-4" aria-hidden /> Crear cátedra
        </LinkButton>
      </div>
      {cards.length === 0 ? (
        <EmptyState className="mt-6" title="Todavía no tenés cátedras." action={<LinkButton href="/docente/catedras/nueva">Configurar cátedra</LinkButton>}>
          Cargá el programa y Educai te propone un mapa de temas y capacidades.
        </EmptyState>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <a key={c.section.id} href={c.setup === "active" ? `/docente/c/${c.section.id}` : `/docente/catedras/nueva?seccion=${c.section.id}`} className="group">
              <Card as="div" className="h-full p-5 transition-shadow group-hover:shadow-[var(--shadow-raised)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink-muted">
                      {c.section.name} · {c.section.term}
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold leading-snug">{c.subject.name}</h2>
                  </div>
                  {c.setup === "active" ? <Pill tone="solid">Activa</Pill> : <Pill tone="attention">Configurar</Pill>}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
                  {c.o.totalClasses > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-4" aria-hidden /> Clase {c.o.currentClass} de {c.o.totalClasses}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden /> {c.o.enrolledCount} estudiantes
                  </span>
                  {c.o.milestone && (
                    <span>
                      {c.o.milestone.title} en {c.o.milestoneInDays} días
                    </span>
                  )}
                </div>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                  {c.setup === "active" ? "Abrir cátedra" : "Configurar cátedra"} <ArrowRight className="size-4" aria-hidden />
                </p>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
