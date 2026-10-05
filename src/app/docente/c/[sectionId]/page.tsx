import QRCode from "qrcode";
import { ArrowRight, CalendarClock, ClipboardList, Flag, MessageSquareQuote, Radio, Sparkles, TrendingDown, UserPlus, Users } from "lucide-react";
import { getDb } from "@/db/client";
import { baseUrl } from "@/lib/base-url";
import { requireTeacher } from "@/modules/identity/session";
import { getTeacherHome } from "@/modules/teacher-projection/service";
import { track } from "@/modules/shared/outbox";
import { FindingCard } from "@/ui/finding-card";
import { GenerateExperienceButton } from "@/ui/generate-experience";
import { Card, Eyebrow, LinkButton, SectionTitle } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Inicio de cátedra" };

/** T-10 Inicio docente: ¿Qué necesita mi aula y qué debería hacer ahora? */
export default async function TeacherHome({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  const h = await getTeacherHome(db, user.id, sectionId);
  await track(db, "teacher_home_viewed", { userId: user.id, courseSectionId: sectionId, properties: { state: h.state } });
  const base = `/docente/c/${sectionId}`;
  const rec = h.recommended;
  // Sin evidencia todavía: la primera tarea es sumar estudiantes a la cátedra.
  const invite = h.state === "no_evidence" ? `${await baseUrl()}/x/${h.section.joinCode}` : null;
  const inviteQr = invite ? await QRCode.toString(invite, { type: "svg", margin: 1, color: { dark: "#16182b", light: "#ffffff" } }) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <CalendarClock className="size-4 text-ink-muted" aria-hidden /> Clase {h.progress.classIndex} de {h.progress.plannedClasses}
          <span className="font-normal text-ink-muted">· {h.progress.timePct}% del cuatrimestre</span>
        </span>
        {h.progress.nextMilestone && (
          <span className="inline-flex items-center gap-1.5">
            <Flag className="size-4 text-ink-muted" aria-hidden /> Próximo hito: <strong>{h.progress.nextMilestone.title}</strong> en {h.progress.nextMilestone.inDays} días
          </span>
        )}
        {h.progress.currentTopic && (
          <span>
            Tema actual: <strong>{h.progress.currentTopic}</strong>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <Users className="size-4" aria-hidden /> {h.coverage.enrolled} estudiantes · código {h.section.joinCode}
        </span>
      </div>

      {h.activeLaunch && (
        <a href={`${base}/lanzamientos/${h.activeLaunch.launchId}`} className="flex items-center gap-3 rounded-lg bg-brand-600 px-4 py-3 text-white shadow-[var(--shadow-raised)] hover:bg-brand-700">
          <Radio className="size-5 animate-pulse" aria-hidden />
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/75">Experiencia abierta · código {h.activeLaunch.joinCode}</span>
            <span className="block font-semibold">{h.activeLaunch.title}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold">
            Ver en vivo <ArrowRight className="size-4" aria-hidden />
          </span>
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {h.recentChanges.length > 0 && (
            <section aria-labelledby="cambio">
              <SectionTitle id="cambio">Qué cambió con la última experiencia</SectionTitle>
              <div className="space-y-2">
                {h.recentChanges.map((c) => (
                  <a key={c.launchId} href={`${base}/lanzamientos/${c.launchId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-solid-600/20 bg-solid-50 px-4 py-3 hover:brightness-[0.98]">
                    <TrendingDown className="size-5 text-solid-700" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.capabilityLabel}</span>
                      <span className="block text-sm text-ink-soft">
                        {c.title}
                        {c.open ? " · abierta" : ""}
                      </span>
                    </span>
                    <span className="text-sm text-ink-soft">
                      Necesita revisar: <strong className="tabular-nums text-ink">{c.beforePct}%</strong> ({c.beforeN}) →{" "}
                      <strong className={`tabular-nums ${c.afterPct < c.beforePct ? "text-solid-700" : "text-attention-700"}`}>{c.afterPct}%</strong> ({c.afterN})
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="necesita">
            <SectionTitle id="necesita">Qué necesita tu aula hoy</SectionTitle>
            {h.state === "no_evidence" && (
              <EmptyState icon={<Sparkles className="size-5" aria-hidden />} title="Todavía no tenemos suficiente evidencia del aula." className="mb-4">
                {h.coverage.enrolled === 0
                  ? "Cuando tus estudiantes se sumen y hagan una primera actividad, acá vas a ver qué necesita el aula."
                  : "No vamos a inventar hallazgos. Una experiencia breve permite observar cómo está tu aula en el tema actual."}
              </EmptyState>
            )}
            {invite && inviteQr && (
              <Card className="mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div
                  className="size-28 shrink-0 self-center overflow-hidden rounded-md border border-line bg-white p-1 [&_svg]:size-full"
                  role="img"
                  aria-label={`Código QR para unirse a la cátedra con el código ${h.section.joinCode}`}
                  dangerouslySetInnerHTML={{ __html: inviteQr }}
                />
                <div className="min-w-0 space-y-1">
                  <p className="inline-flex items-center gap-1.5 font-semibold">
                    <UserPlus className="size-4 text-brand-600" aria-hidden /> Invitá a tus estudiantes
                  </p>
                  <p className="text-[15px] text-ink-soft">
                    Que escaneen el QR o entren a Educai con el código <strong className="font-mono text-ink">{h.section.joinCode}</strong>.
                  </p>
                  <p className="break-all text-sm text-ink-muted">{invite}</p>
                </div>
              </Card>
            )}
            {h.state === "low_coverage" && (
              <p className="mb-3 rounded-md bg-unknown-50 px-3 py-2 text-sm text-ink-soft">Tenemos señales, pero todavía cubren a pocos estudiantes.</p>
            )}
            {h.state === "no_attention_required" && (
              <EmptyState title="No aparece una dificultad prioritaria con la evidencia actual." action={<LinkButton href={`${base}/preparar`} variant="secondary">Preparar próxima clase</LinkButton>} />
            )}
            <div className="space-y-3">
              {h.state !== "no_evidence" && h.priorities.map((f, i) => (
                <FindingCard key={f.findingId} f={f} href={`${base}/hallazgos/${f.findingId}`} primary={i === 0 && f.type === "needs_review"} />
              ))}
            </div>
          </section>

          {rec && (
            <section aria-labelledby="recomendada">
              <SectionTitle id="recomendada">Experiencia recomendada</SectionTitle>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-brand-700 to-brand-500 p-5 text-white">
                  <Eyebrow className="text-white/70">{rec.strategy === "decision_scenario" ? "Escenario de decisión · individual" : "Diagnóstico breve"} · {rec.minutes} min</Eyebrow>
                  <h3 className="mt-2 text-xl font-bold leading-snug">{rec.existingDefinitionTitle ?? rec.title}</h3>
                </div>
                <div className="space-y-3 p-5">
                  <p className="text-[15px] leading-relaxed">{rec.why}</p>
                  <p className="text-sm text-ink-soft">
                    <span className="font-semibold text-ink">En el aula: </span>
                    {rec.inClass}
                  </p>
                  <div className="flex flex-wrap items-start gap-2 pt-1">
                    {rec.openLaunchId ? (
                      <LinkButton href={`${base}/lanzamientos/${rec.openLaunchId}`}>
                        <Radio className="size-4" aria-hidden /> Ver en vivo
                      </LinkButton>
                    ) : rec.existingDefinitionId ? (
                      <LinkButton href={`${base}/experiencias/${rec.existingDefinitionId}`}>Ver experiencia</LinkButton>
                    ) : rec.generationAvailable ? (
                      <GenerateExperienceButton sectionId={sectionId} findingId={rec.findingId} label="Generar experiencia" />
                    ) : (
                      <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-soft">Para generar experiencias de temas nuevos hace falta activar la IA en esta instalación.</p>
                    )}
                    {h.state !== "no_evidence" && (
                      <LinkButton href={`${base}/hallazgos/${rec.findingId}`} variant="ghost">
                        Ver evidencia del hallazgo
                      </LinkButton>
                    )}
                  </div>
                </div>
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="preparar">
            <SectionTitle id="preparar">Preparar próxima clase</SectionTitle>
            <Card className="p-5">
              <p className="text-[15px] text-ink-soft">Una secuencia de clase armada a partir de lo que necesita tu aula, con tiempos y materiales.</p>
              <LinkButton href={`${base}/preparar`} className="mt-4" full>
                <ClipboardList className="size-4" aria-hidden /> Preparar clase {h.progress.classIndex + 1}
              </LinkButton>
            </Card>
          </section>

          {h.improvement && (
            <section aria-labelledby="mejorar">
              <SectionTitle id="mejorar">Qué podés mejorar en tu próxima clase</SectionTitle>
              <Card className="space-y-3 p-5 text-[15px]">
                <p className="flex items-start gap-2">
                  <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  <span>
                    <span className="font-semibold">Principal oportunidad: </span>
                    {h.improvement.mainOpportunity}
                  </span>
                </p>
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Qué funcionó: </span>
                  {h.improvement.worked}
                </p>
                <p className="rounded-md bg-brand-50 px-3 py-2 text-brand-900">
                  <span className="font-semibold">Probá: </span>
                  {h.improvement.tryNext}
                </p>
                {h.improvement.respondents && <p className="text-xs text-ink-muted">Feedback anónimo de {h.improvement.respondents} estudiantes.</p>}
              </Card>
            </section>
          )}

          <section aria-labelledby="perfil">
            <SectionTitle id="perfil">Perfil general del aula</SectionTitle>
            <Card className="p-5">
              <p className="text-[15px] text-ink-soft">Intereses y contexto profesional del grupo, siempre agregados.</p>
              <a href={`${base}/aula`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                Ver tu aula <ArrowRight className="size-4" aria-hidden />
              </a>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
