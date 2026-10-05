import { ArrowRight, BookOpen, KeyRound } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getStudentHome } from "@/modules/recommendation/service";
import { getCourseHome } from "@/modules/student-view/service";
import { AcademicStateBadge } from "@/ui/academic";
import { Button, Card, SectionTitle } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Mis materias" };

/** S-20 Mis materias + S-21 Unirme a una cátedra. */
export default async function MateriasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireStudent();
  const db = await getDb();
  const home = await getStudentHome(db, user.id);
  const courses = await Promise.all(home.sections.map((s) => getCourseHome(db, user.id, s.section.id)));

  return (
    <div className="space-y-7">
      <h1 className="text-2xl font-bold tracking-tight">Mis materias</h1>
      {courses.length === 0 && (
        <EmptyState icon={<BookOpen className="size-5" aria-hidden />} title="Todavía no estás en ninguna cátedra.">
          Ingresá el código que te compartió tu docente.
        </EmptyState>
      )}
      <div className="space-y-3">
        {courses.map((c) => (
          <a key={c.section.id} href={`/estudiante/materias/${c.section.id}`} className="group block">
            <Card as="div" className="p-4 transition-shadow group-hover:shadow-[var(--shadow-raised)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink-muted">{c.section.name}</p>
                  <h2 className="text-lg font-semibold leading-snug">{c.subjectName}</h2>
                </div>
                <ArrowRight className="mt-1 size-5 shrink-0 text-ink-muted group-hover:text-brand-600" aria-hidden />
              </div>
              {c.objective && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-[15px] text-ink-soft">
                    <span className="font-semibold text-ink">Objetivo actual: </span>
                    {c.objective.statement}
                  </p>
                  <AcademicStateBadge state={c.objective.state} size="sm" />
                </div>
              )}
              {c.next && (
                <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                  Próxima acción: {c.next.title}
                </p>
              )}
            </Card>
          </a>
        ))}
      </div>

      <section id="unirme" aria-labelledby="join">
        <SectionTitle id="join">Unirme a una cátedra</SectionTitle>
        <Card className="p-4">
          <form method="post" action="/api/v1/course-sections/join" className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="code">
              Código de la cátedra
            </label>
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                id="code"
                name="code"
                required
                maxLength={12}
                defaultValue={sp.codigo ?? ""}
                placeholder="Código (por ejemplo, IPDP26)"
                className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-[15px] uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
              />
            </div>
            <Button type="submit">Unirme</Button>
          </form>
          {sp.join === "ok" && <p className="mt-2 text-sm text-solid-700">Listo, ya estás en la cátedra.</p>}
          {sp.join === "ya" && <p className="mt-2 text-sm text-ink-soft">Ya estabas en esa cátedra.</p>}
          {sp.join === "error" && <p className="mt-2 text-sm text-error-600" role="alert">No encontramos una cátedra con ese código. Revisalo con tu docente.</p>}
          <p className="mt-2 text-xs text-ink-muted">No vas a repetir el onboarding: tu perfil es el mismo en todas tus materias.</p>
        </Card>
      </section>
    </div>
  );
}
