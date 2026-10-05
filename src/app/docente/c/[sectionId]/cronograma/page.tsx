import { CheckCircle2, CircleDot, Circle, Flag } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { milestones } from "@/db/schema";
import { requireTeacher } from "@/modules/identity/session";
import { assertTeacherOfSection, currentClassFrom, getSchedule } from "@/modules/academic/service";
import { Card, cx } from "@/ui/primitives";

export const metadata = { title: "Cronograma" };

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

/** T-30 Cronograma: planificado ≠ realizado. */
export default async function SchedulePage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  await assertTeacherOfSection(db, user.id, sectionId);
  const schedule = await getSchedule(db, sectionId);
  const current = currentClassFrom(schedule);
  const ms = await db.select().from(milestones).where(eq(milestones.courseSectionId, sectionId)).orderBy(asc(milestones.dueAt));
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cronograma</h2>
      {ms.map((m) => (
        <p key={m.id} className="inline-flex items-center gap-2 rounded-full bg-attention-50 px-3 py-1.5 text-sm font-semibold text-attention-700">
          <Flag className="size-4" aria-hidden /> {m.title} · {m.dueAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Cordoba" })}
        </p>
      ))}
      <Card className="divide-y divide-line">
        {schedule.map((c) => {
          const isCurrent = c.sequenceNo === current;
          return (
            <div key={c.id} className={cx("flex items-start gap-3 px-4 py-3", isCurrent && "bg-brand-50/60")}>
              {c.status === "closed" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-solid-600" aria-label="Realizada" />
              ) : isCurrent ? (
                <CircleDot className="mt-0.5 size-5 shrink-0 text-brand-600" aria-label="Clase actual" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-line-strong" aria-label="Planificada" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Clase {c.sequenceNo} · {c.title}
                </p>
                <p className="text-sm text-ink-muted">
                  {fmt(c.plannedDate)} · {c.status === "closed" ? "Ocurrió" : isCurrent ? "Hoy" : "Planificado"}
                </p>
                {c.actualSummary && <p className="mt-1 text-sm text-ink-soft">{c.actualSummary}</p>}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
