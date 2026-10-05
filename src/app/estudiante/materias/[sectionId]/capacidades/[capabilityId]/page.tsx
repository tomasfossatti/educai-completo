import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircleQuestion, PlayCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getCapabilityDetail } from "@/modules/student-view/service";
import { DomainError } from "@/modules/shared/errors";
import { track } from "@/modules/shared/outbox";
import { AcademicStateBadge, LEVEL_LABEL } from "@/ui/academic";
import { Button, Card, LinkButton, SectionTitle, cx } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Capacidad" };

const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Cordoba" });

/** S-23 Detalle de capacidad + S-24 Evidencia del estudiante. */
export default async function CapabilityPage({ params }: { params: Promise<{ sectionId: string; capabilityId: string }> }) {
  const { sectionId, capabilityId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  let d;
  try {
    d = await getCapabilityDetail(db, user.id, sectionId, capabilityId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  await track(db, "capability_detail_viewed", { userId: user.id, courseSectionId: sectionId });

  return (
    <div className="space-y-6">
      <a href={`/estudiante/materias/${sectionId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Volver a la materia
      </a>
      <header className="space-y-3">
        <p className="text-sm text-ink-muted">{d.capability.topic}</p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">{d.capability.statement}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AcademicStateBadge state={d.state} />
          {d.highestLevel && <span className="text-sm text-ink-muted">Nivel más alto demostrado: {LEVEL_LABEL[d.highestLevel]}</span>}
        </div>
      </header>

      <Card className="space-y-3 p-4 sm:p-5">
        {d.capability.explanation && <p className="text-[15px] leading-relaxed">{d.capability.explanation}</p>}
        {d.state === "unknown" && <p className="text-[15px] text-ink-soft">Todavía no tenemos evidencia suficiente para decir cómo venís en esta capacidad.</p>}
        {d.contradiction && (
          <p className="rounded-md bg-attention-50 px-3 py-2 text-[15px] text-attention-700">
            {d.contradiction}
          </p>
        )}
        {d.unresolvedErrors.length > 0 && (
          <p className="text-[15px] text-ink-soft">
            <span className="font-semibold text-ink">Lo que conviene revisar: </span>
            {d.unresolvedErrors.join("; ")}.
          </p>
        )}
        <p className="text-[15px] text-ink-soft">
          <span className="font-semibold text-ink">Qué falta: </span>
          {d.missing}
        </p>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          {d.relatedRec ? (
            <LinkButton href={`/estudiante/recomendaciones/${d.relatedRec.id}/empezar`}>
              <PlayCircle className="size-4" aria-hidden /> Trabajar esto
            </LinkButton>
          ) : null}
          <form method="post" action="/api/v1/conversations/new">
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="capabilityId" value={capabilityId} />
            <input type="hidden" name="intent" value="understand" />
            <Button variant={d.relatedRec ? "secondary" : "primary"} type="submit" full>
              <MessageCircleQuestion className="size-4" aria-hidden /> Entender mejor con el tutor
            </Button>
          </form>
        </div>
      </Card>

      <section aria-labelledby="evidencia">
        <SectionTitle id="evidencia">Qué evidencia tenemos</SectionTitle>
        {d.evidence.length === 0 ? (
          <EmptyState title="Todavía no hay evidencia sobre esta capacidad.">Cuando hagas una actividad o le expliques algo al tutor, va a aparecer acá.</EmptyState>
        ) : (
          <ol className="space-y-2">
            {d.evidence.map((e) => (
              <li key={e.id}>
                <Card as="article" className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
                    <span>
                      {fmt(new Date(e.date))} · {e.source}
                    </span>
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 text-xs font-semibold",
                        e.polarity === "supports" ? "text-solid-700" : e.polarity === "challenges" ? "text-attention-700" : "text-ink-muted",
                      )}
                    >
                      {e.polarity === "supports" ? <ThumbsUp className="size-3.5" aria-hidden /> : e.polarity === "challenges" ? <ThumbsDown className="size-3.5" aria-hidden /> : null}
                      {e.polarity === "supports" ? "A favor" : e.polarity === "challenges" ? "Para revisar" : "No concluyente"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-snug">
                    <span className="font-semibold">Qué observamos: </span>
                    {e.observed}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">Nivel de ayuda: {e.assistance}</p>
                  {e.assisted && (
                    <p className="mt-1.5 text-sm text-ink-soft">
                      Esta respuesta ocurrió después de varias pistas, por eso la usamos principalmente para orientar práctica y no como demostración independiente.
                    </p>
                  )}
                  {e.practiceOnly && <p className="mt-1.5 text-sm text-ink-soft">La usamos como práctica: ya habías visto la respuesta en un intento anterior.</p>}
                  {e.belowTarget && <p className="mt-1.5 text-sm text-ink-soft">Muestra que lo explicás; para esta capacidad todavía falta verlo aplicado.</p>}
                  {e.link && (
                    <a href={e.link} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                      Ver fuente <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
