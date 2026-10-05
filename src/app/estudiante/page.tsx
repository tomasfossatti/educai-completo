import Link from "next/link";
import { BookOpen, Compass, History, Sparkles } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getStudentHome, setRecommendationStatus } from "@/modules/recommendation/service";
import { track } from "@/modules/shared/outbox";
import { NextStepCard, PendingItem, startHref } from "@/ui/recommendation-card";
import { LinkButton, SectionTitle } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Inicio" };

/** S-10 Inicio estudiante: ¿Qué es lo más útil que puedo hacer ahora? */
export default async function StudentHome() {
  const user = await requireStudent();
  const db = await getDb();
  const home = await getStudentHome(db, user.id);
  if (home.nextAction) await setRecommendationStatus(db, home.nextAction.id, "surfaced");
  await track(db, "student_home_viewed", { userId: user.id, properties: { next_action: home.nextAction?.priorityClass ?? null } });
  const firstName = user.displayName.split(" ")[0];

  if (home.sections.length === 0) {
    return (
      <EmptyState icon={<BookOpen className="size-5" aria-hidden />} title="Todavía no estás en ninguna cátedra." action={<LinkButton href="/estudiante/materias#unirme">Unirme a una cátedra</LinkButton>}>
        Tu docente te puede compartir un código, un link o un QR.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-7">
      <p className="text-[15px] text-ink-soft">Hola, {firstName}.</p>

      {home.nextAction ? (
        <NextStepCard rec={home.nextAction} />
      ) : (
        <EmptyState icon={<Sparkles className="size-5" aria-hidden />} title="Estás al día por ahora." action={<LinkButton href="/estudiante/materias" variant="secondary">Explorar una materia</LinkButton>}>
          No inventamos actividades: cuando haya algo útil para hacer, va a aparecer acá.
        </EmptyState>
      )}

      {home.resume && (
        <section aria-labelledby="resume">
          <SectionTitle id="resume">Continuar donde quedaste</SectionTitle>
          <a href={startHref(home.resume.id)} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-brand-200">
            <History className="size-5 text-brand-600" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{home.resume.title}</span>
              <span className="block text-sm text-ink-muted">{home.resume.explanation.short}</span>
            </span>
          </a>
        </section>
      )}

      {home.otherPending.length > 0 && (
        <section aria-labelledby="pending">
          <SectionTitle id="pending">Otros pendientes</SectionTitle>
          <div className="space-y-2">
            {home.otherPending.map((r) => (
              <PendingItem key={r.id} rec={r} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="materias">
        <SectionTitle id="materias" action={<Link href="/estudiante/materias" className="text-sm font-semibold text-brand-700 hover:underline">Ver todas</Link>}>
          Tus materias
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {home.sections.map((s) => (
            <Link key={s.section.id} href={`/estudiante/materias/${s.section.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-brand-200">
              <Compass className="size-5 text-ink-muted" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{s.subject.name}</span>
                <span className="block text-sm text-ink-muted">{s.section.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
