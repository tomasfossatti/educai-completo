import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Compass, FileSearch, Lightbulb, Radio, ShieldCheck } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getFindingDetail } from "@/modules/teacher-projection/service";
import { DomainError } from "@/modules/shared/errors";
import { track } from "@/modules/shared/outbox";
import { LEVEL_LABEL, PrivacyNotice } from "@/ui/academic";
import { FindingValidation } from "@/ui/finding-validation";
import { GenerateExperienceButton } from "@/ui/generate-experience";
import { Card, Eyebrow, LinkButton } from "@/ui/primitives";

export const metadata = { title: "¿Por qué Educai detectó esto?" };

const SOURCE_LABEL: Record<string, string> = {
  interactive_experience: "Actividades con situaciones de decisión",
  educai_ai_chat: "Explicaciones en el tutor de Educai",
  external_ai_transcript: "Conversaciones con otras IA subidas por estudiantes",
  structured_activity: "Trabajos prácticos",
  exit_ticket: "Cierres de clase",
};

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

/** T-11 Finding detail: Decidir → Entender → Auditar. Todo agregado y anonimizado. */
export default async function FindingPage({ params }: { params: Promise<{ sectionId: string; findingId: string }> }) {
  const { sectionId, findingId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  let f;
  try {
    f = await getFindingDetail(db, user.id, sectionId, findingId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  await track(db, "traceability_opened", { userId: user.id, courseSectionId: sectionId, properties: { finding_id: findingId } });
  const base = `/docente/c/${sectionId}`;
  const iv = f.decide.intervention;
  const maxDay = Math.max(1, ...f.audit.timeline.map((t) => t.evidenceCount));

  return (
    <div className="space-y-6">
      <a href={base} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
      </a>

      {/* DECIDIR */}
      <section aria-labelledby="decidir" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-6">
          <Eyebrow>{f.capability.label}</Eyebrow>
          <h2 id="decidir" className="mt-2 text-2xl font-bold leading-tight tracking-tight">
            {f.decide.headline}
          </h2>
          <p className="mt-2 text-[16px] text-ink-soft">{f.decide.detail}</p>
          <p className="mt-4 text-sm text-ink-muted">Capacidad: {f.capability.statement} (nivel esperado: {LEVEL_LABEL[f.capability.level]})</p>
        </Card>
        <Card className="flex flex-col p-5">
          <Eyebrow>Intervención recomendada</Eyebrow>
          <h3 className="mt-2 text-lg font-semibold leading-snug">{iv.existingDefinitionTitle ?? iv.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">{iv.minutes} min · {iv.strategy === "decision_scenario" ? "situaciones de decisión" : "diagnóstico breve"}</p>
          <p className="mt-3 text-[15px] leading-relaxed">{iv.why}</p>
          <div className="mt-auto pt-4">
            {iv.openLaunchId ? (
              <LinkButton href={`${base}/lanzamientos/${iv.openLaunchId}`} full>
                <Radio className="size-4" aria-hidden /> Ver en vivo
              </LinkButton>
            ) : iv.existingDefinitionId ? (
              <LinkButton href={`${base}/experiencias/${iv.existingDefinitionId}`} full>
                Ver experiencia
              </LinkButton>
            ) : iv.generationAvailable ? (
              <GenerateExperienceButton sectionId={sectionId} findingId={f.findingId} full />
            ) : (
              <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-soft">Para generar experiencias de temas nuevos hace falta activar la IA en esta instalación.</p>
            )}
          </div>
        </Card>
      </section>

      {/* ENTENDER */}
      <section aria-labelledby="entender">
        <h2 id="entender" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
          <Compass className="size-4 text-brand-600" aria-hidden /> ¿Por qué Educai detectó esto?
        </h2>
        <Card className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            {f.understand.ratePct !== null ? (
              <>
                <p className="text-5xl font-bold tabular-nums text-attention-700">{f.understand.ratePct}%</p>
                <p className="mt-2 text-sm text-ink-soft">
                  <strong className="text-ink">
                    {f.understand.numerator} de {f.understand.denominator}
                  </strong>{" "}
                  estudiantes con evidencia suficiente
                </p>
              </>
            ) : (
              <>
                <p className="text-5xl font-bold tabular-nums text-ink-soft">
                  {f.understand.numerator}/{f.understand.enrolled}
                </p>
                <p className="mt-2 text-sm text-ink-soft">estudiantes con evidencia suficiente</p>
              </>
            )}
            <div className="mt-4" aria-hidden>
              <div className="flex h-3 overflow-hidden rounded-full bg-unknown-50">
                <div className={f.understand.ratePct !== null ? "bg-attention-600" : "bg-ink-soft/50"} style={{ width: `${(f.understand.numerator / Math.max(1, f.understand.enrolled)) * 100}%` }} />
                <div className="bg-solid-600/50" style={{ width: `${((f.understand.denominator - (f.understand.ratePct !== null ? f.understand.numerator : 0)) / Math.max(1, f.understand.enrolled)) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">{f.understand.enrolled} inscriptos · el resto todavía no tiene evidencia suficiente</p>
            </div>
          </div>
          <div className="space-y-3 text-[15px] leading-relaxed">
            <p>{f.understand.howCalculated}</p>
            {f.understand.cognitiveGap && (
              <p className="flex items-start gap-2 rounded-md bg-attention-50 px-3 py-2 text-attention-700">
                <Lightbulb className="mt-1 size-4 shrink-0" aria-hidden /> {f.understand.cognitiveGap}
              </p>
            )}
            {f.understand.prerequisiteOf.length > 0 && (
              <p className="text-ink-soft">
                <span className="font-semibold text-ink">Por qué importa ahora: </span>
                es base de {f.understand.prerequisiteOf.map((p) => `“${p}”`).join(" y ")}
                {f.understand.assessmentInDays !== null ? `, y el parcial es en ${f.understand.assessmentInDays} días.` : "."}
              </p>
            )}
          </div>
        </Card>
      </section>

      {/* AUDITAR */}
      <section aria-labelledby="auditar">
        <h2 id="auditar" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
          <FileSearch className="size-4 text-brand-600" aria-hidden /> Evidencia anonimizada
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm font-semibold">Cómo se equivocaron</p>
            {f.audit.patterns.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {f.audit.patterns.map((p) => (
                  <li key={p.label} className="flex items-start justify-between gap-3 text-[15px]">
                    <span>{p.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{p.count} est.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No hay un patrón compartido por 5 o más estudiantes.</p>
            )}
            {f.audit.otherPatternsSuppressed && <div className="mt-3"><PrivacyNotice>Hay otros patrones con menos de 5 estudiantes: no los mostramos para preservar privacidad.</PrivacyNotice></div>}
            {f.audit.contradictions !== null && (
              <p className="mt-3 text-sm text-ink-soft">{f.audit.contradictions} estudiantes muestran evidencia contradictoria: explican bien, pero fallan al aplicar.</p>
            )}
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">De dónde sale la evidencia</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              {f.audit.sourceTypes.map((s) => (
                <li key={s.type} className="flex items-center justify-between gap-3">
                  <span>{SOURCE_LABEL[s.type] ?? s.type}</span>
                  <span className="font-semibold tabular-nums">{s.count} observaciones</span>
                </li>
              ))}
            </ul>
            {f.audit.timeline.length > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <BarChart3 className="size-3.5" aria-hidden /> Cuándo se observó
                </p>
                <div className="mt-2 flex h-20 items-end gap-1.5" role="img" aria-label="Observaciones por día">
                  {f.audit.timeline.map((t) => (
                    <div key={t.day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-brand-200" style={{ height: `${(t.evidenceCount / maxDay) * 64}px` }} title={`${t.evidenceCount} observaciones`} />
                      <span className="text-[10px] text-ink-muted">{fmtDay(t.day)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-4 p-5">
          <p className="text-sm font-semibold">Ejemplos anónimos</p>
          {f.audit.examples.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {f.audit.examples.map((e) => (
                <li key={e.chosenAnswer} className="rounded-md bg-canvas p-4">
                  <p className="text-sm text-ink-soft">{e.situation}</p>
                  <p className="mt-1 text-sm font-semibold">{e.question}</p>
                  <p className="mt-2 text-[15px]">
                    <span className="font-semibold tabular-nums text-attention-700">{e.students} estudiantes</span> eligieron: “{e.chosenAnswer}”
                  </p>
                  {e.errorLabel && <p className="mt-1 text-xs text-ink-muted">Patrón: {e.errorLabel}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2">
              <PrivacyNotice>No hay respuestas compartidas por 5 o más estudiantes, así que no mostramos ejemplos.</PrivacyNotice>
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="size-4" aria-hidden /> Educai nunca muestra quién respondió qué. Las cifras con menos de 5 estudiantes se ocultan.
          </p>
        </Card>

        <Card className="mt-4 p-5">
          <FindingValidation findingId={f.findingId} sectionId={sectionId} initial={f.audit.lastValidation} />
        </Card>
      </section>
    </div>
  );
}
