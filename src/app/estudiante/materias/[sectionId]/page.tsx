import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronRight, MessagesSquare, Telescope } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getCourseHome } from "@/modules/student-view/service";
import { DomainError } from "@/modules/shared/errors";
import { track } from "@/modules/shared/outbox";
import { AcademicStateBadge, JourneyStepper, journeyFrom } from "@/ui/academic";
import { Card, Eyebrow, SectionTitle } from "@/ui/primitives";
import { NextStepCard } from "@/ui/recommendation-card";

export const metadata = { title: "Materia" };

/** S-22 Materia: ¿Dónde estoy? → ¿Qué estoy aprendiendo? → ¿Qué me falta? → ¿Qué hago ahora? */
export default async function CoursePage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  let c;
  try {
    c = await getCourseHome(db, user.id, sectionId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  await track(db, "course_opened", { userId: user.id, courseSectionId: sectionId });
  const journey = journeyFrom(c.journey);
  const capHref = (id: string) => `/estudiante/materias/${sectionId}/capacidades/${id}`;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-ink-muted">{c.section.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">{c.subjectName}</h1>
        {c.unitTitle && <p className="mt-1 text-[15px] text-ink-soft">{c.unitTitle}</p>}
      </header>

      {c.objective && (
        <section aria-labelledby="objetivo">
          <Eyebrow>Objetivo actual</Eyebrow>
          <a href={capHref(c.objective.capabilityId)} className="mt-2 flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-4 hover:border-brand-200 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="objetivo" className="text-lg font-semibold leading-snug">
              {c.objective.statement}
            </h2>
            <AcademicStateBadge state={c.objective.state} size="sm" />
          </a>
        </section>
      )}

      {c.next && <NextStepCard rec={{ ...c.next, subjectName: c.subjectName }} showSubject={false} />}

      <section aria-labelledby="como-venis">
        <SectionTitle id="como-venis">Cómo venís</SectionTitle>
        <Card className="divide-y divide-line">
          {c.how.map((h) => (
            <a key={h.id} href={capHref(h.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas">
              <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug">{h.label}</span>
                  <span className="line-clamp-1 block text-sm text-ink-muted">{h.statement}</span>
                </span>
                <AcademicStateBadge state={h.state} size="sm" />
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
            </a>
          ))}
        </Card>
      </section>

      <section aria-labelledby="recorrido">
        <SectionTitle id="recorrido">Tu recorrido en la unidad</SectionTitle>
        <Card className="p-4">
          <JourneyStepper done={journey.done} current={journey.current} />
        </Card>
      </section>

      {c.canDo.length > 0 && (
        <section aria-labelledby="ya-podes">
          <SectionTitle id="ya-podes">Lo que ya podés hacer</SectionTitle>
          <ul className="space-y-2">
            {c.canDo.map((x) => (
              <li key={x.id}>
                <a href={capHref(x.id)} className="flex items-start gap-2.5 rounded-lg bg-solid-50 px-4 py-3 text-[15px] text-ink hover:brightness-[0.98]">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-solid-600" aria-hidden />
                  <span className="flex-1">{x.statement}</span>
                  <span className="text-xs font-semibold text-solid-700">Ver evidencia</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.upcoming.items.length > 0 && (
        <section aria-labelledby="viene">
          <SectionTitle id="viene">Lo que viene</SectionTitle>
          <Card className="p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <Telescope className="size-4" aria-hidden /> Próximas clases
            </p>
            <ul className="mt-2 space-y-1 text-[15px] text-ink-soft">
              {c.upcoming.items.map((u) => (
                <li key={u.id}>• {u.statement}</li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <a href={`/estudiante/materias/${sectionId}/subir`} className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-4 py-3 text-[15px] hover:border-brand-200">
        <MessagesSquare className="size-5 text-ink-muted" aria-hidden />
        <span className="flex-1">
          <span className="font-semibold">¿Estudiaste esto con otra IA?</span>
          <span className="block text-sm text-ink-muted">Subí la conversación y la usamos como evidencia.</span>
        </span>
        <ArrowRight className="size-4 text-ink-muted" aria-hidden />
      </a>
    </div>
  );
}
