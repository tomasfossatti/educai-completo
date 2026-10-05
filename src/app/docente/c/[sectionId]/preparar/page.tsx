import { ArrowLeft, Clock, Lightbulb, Target } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getTeacherHome } from "@/modules/teacher-projection/service";
import { track } from "@/modules/shared/outbox";
import { GenerateExperienceButton } from "@/ui/generate-experience";
import { Card, Eyebrow, LinkButton } from "@/ui/primitives";
import { EmptyState } from "@/ui/states";

export const metadata = { title: "Preparar próxima clase" };

/**
 * T-51 Preparar próxima clase. Propuesta determinista armada con las prioridades del aula,
 * la experiencia recomendada y el feedback anónimo de la clase anterior (PRD §29-30).
 */
export default async function PrepareClassPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  const h = await getTeacherHome(db, user.id, sectionId);
  await track(db, "next_class_prepared", { userId: user.id, courseSectionId: sectionId });
  const base = `/docente/c/${sectionId}`;
  const top = h.priorities.find((p) => p.type === "needs_review");
  const second = h.priorities.filter((p) => p !== top)[0];
  const rec = h.recommended;
  const nextClass = h.progress.classIndex + 1;

  if (!top || !rec) {
    return (
      <EmptyState title="Todavía no hay prioridades para planificar con evidencia." action={<LinkButton href={base}>Volver al inicio</LinkButton>}>
        Cuando haya evidencia del aula vamos a proponerte una secuencia de clase.
      </EmptyState>
    );
  }

  const steps = [
    { min: 5, title: "Pregunta de apertura", detail: `Proyectá la situación con más dispersión y pedí una votación a mano alzada: ¿quién debería intervenir? Todavía sin dar la respuesta.` },
    { min: rec.minutes, title: rec.existingDefinitionTitle ?? rec.title, detail: "Individual desde el celular con el QR. Cada estudiante decide y recibe feedback inmediato. Vos ves la distribución agregada en vivo." },
    { min: 10, title: "Puesta en común", detail: "Volvé sobre la situación con más dispersión. Pedí argumentos de ambos lados antes de cerrar con el criterio: ¿la decisión es sobre qué construir o sobre cómo trabaja el equipo?" },
    second
      ? { min: 15, title: `Segundo foco: ${second.capabilityLabel}`, detail: second.type === "low_coverage" ? "Actividad corta para observar cómo está el aula antes de decidir qué reforzar." : second.detail }
      : { min: 15, title: "Aplicación en el proyecto", detail: "En grupos, cada equipo identifica en su proyecto una decisión de producto y una de proceso, y quién la tomaría." },
    { min: 5, title: "Cierre", detail: "Una situación nueva para responder individualmente al salir. Genera evidencia para la próxima clase." },
  ];
  const total = steps.reduce((s, x) => s + x.min, 0);

  return (
    <div className="space-y-6">
      <a href={base} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
      </a>
      <header>
        <Eyebrow>Clase {nextClass} · propuesta</Eyebrow>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Preparar próxima clase</h2>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <Target className="size-4 text-brand-600" aria-hidden /> Objetivo
            </p>
            <p className="mt-2 text-lg font-semibold leading-snug">Que el aula pueda decidir, en situaciones concretas, qué le corresponde a cada rol ({top.capabilityLabel}).</p>
          </Card>
          <Card className="divide-y divide-line">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <span className="flex w-14 shrink-0 flex-col items-center rounded-md bg-canvas py-1.5 text-sm font-semibold tabular-nums">
                  <Clock className="mb-0.5 size-3.5 text-ink-muted" aria-hidden />
                  {s.min}&apos;
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-[15px] text-ink-soft">{s.detail}</p>
                </div>
              </div>
            ))}
            <p className="px-5 py-3 text-sm text-ink-muted">Total: {total} minutos de los 120 de la clase.</p>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-attention-600" aria-hidden /> Por qué esta secuencia
            </p>
            <ul className="mt-2 space-y-2 text-[15px] text-ink-soft">
              <li>{top.headline} ({top.numerator} de {top.denominator} con evidencia suficiente).</li>
              <li>{rec.why}</li>
              {h.improvement && <li>Feedback de la última clase: {h.improvement.mainOpportunity.charAt(0).toLowerCase()}{h.improvement.mainOpportunity.slice(1)}</li>}
              {h.progress.nextMilestone && <li>{h.progress.nextMilestone.title} en {h.progress.nextMilestone.inDays} días.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Material principal</p>
            <p className="mt-1 text-[15px]">{rec.existingDefinitionTitle ?? rec.title}</p>
            <div className="mt-3">
              {rec.existingDefinitionId ? (
                <LinkButton href={`${base}/experiencias/${rec.existingDefinitionId}`} full>
                  Ver experiencia
                </LinkButton>
              ) : rec.generationAvailable ? (
                <GenerateExperienceButton sectionId={sectionId} findingId={rec.findingId} label="Crear experiencia" full />
              ) : (
                <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-soft">Para generar experiencias de temas nuevos hace falta activar la IA en esta instalación.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
