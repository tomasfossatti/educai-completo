import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, HelpCircle } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getLearningMap } from "@/modules/teacher-projection/service";
import { LEVEL_LABEL, TrendMark } from "@/ui/academic";
import { Card, cx } from "@/ui/primitives";
import type { CapabilityMapRowDTO } from "@/modules/teacher-projection/dto";

export const metadata = { title: "Mapa de aprendizaje" };

const STATUS: Record<CapabilityMapRowDTO["status"], { label: string; icon: React.ReactNode; cls: string }> = {
  attention: { label: "Requiere atención", icon: <AlertTriangle className="size-4" aria-hidden />, cls: "text-attention-700 bg-attention-50" },
  ok: { label: "Sin dificultad prioritaria", icon: <CheckCircle2 className="size-4" aria-hidden />, cls: "text-solid-700 bg-solid-50" },
  insufficient_coverage: { label: "Cobertura insuficiente", icon: <HelpCircle className="size-4" aria-hidden />, cls: "text-unknown-600 bg-unknown-50" },
  not_started: { label: "Todavía no se trabajó", icon: <Clock3 className="size-4" aria-hidden />, cls: "text-ink-muted bg-canvas" },
};

/** T-20 Mapa de aprendizaje: Módulo → Unidad → Tema → Capacidad, sin "% comprendido". */
export default async function MapPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  const map = await getLearningMap(db, user.id, sectionId);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mapa de aprendizaje</h2>
        <p className="text-[15px] text-ink-soft">
          Para cada capacidad: cuántos estudiantes tienen evidencia suficiente y, de ellos, cuántos necesitan revisar. No mostramos porcentajes con menos de 5 estudiantes.
        </p>
      </div>
      {map.modules.map((m) => (
        <section key={m.id} className="space-y-4" aria-labelledby={`m-${m.id}`}>
          <h3 id={`m-${m.id}`} className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {m.title}
          </h3>
          {m.units.map((u) => (
            <Card key={u.id} className="overflow-hidden">
              <div className="border-b border-line bg-canvas px-4 py-3">
                <h4 className="font-semibold">{u.title}</h4>
              </div>
              <div className="hidden grid-cols-[minmax(0,1.6fr)_140px_150px_110px_150px] gap-3 border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted md:grid">
                <span>Capacidad</span>
                <span>Evidencia suficiente</span>
                <span>Necesita revisar</span>
                <span>Tendencia</span>
                <span>Estado</span>
              </div>
              {u.topics.map((t) => (
                <div key={t.id}>
                  <p className="px-4 pt-3 text-sm font-semibold text-ink-soft">{t.title}</p>
                  <ul>
                    {t.capabilities.map((c) => {
                      const st = STATUS[c.status];
                      const row = (
                        <div className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_140px_150px_110px_150px] md:items-center md:gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold leading-snug">{c.label}</p>
                            <p className="text-sm text-ink-muted">{LEVEL_LABEL[c.level]}</p>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold tabular-nums">
                              {c.sufficient}/{c.enrolled}
                            </span>{" "}
                            <span className="text-ink-muted">({c.coveragePct}%)</span>
                            <div className="mt-1 h-1.5 rounded-full bg-unknown-50">
                              <div className="h-full rounded-full bg-ink-soft/50" style={{ width: `${c.coveragePct}%` }} />
                            </div>
                          </div>
                          <div className="text-sm">
                            {c.reviewRatePct !== null ? (
                              <span className={cx("font-semibold tabular-nums", c.reviewRatePct >= 25 ? "text-attention-700" : "text-ink")}>
                                {c.reviewRatePct}% <span className="font-normal text-ink-muted">({c.reviewCount} de {c.sufficient})</span>
                              </span>
                            ) : (
                              <span className="text-ink-muted">Sin datos suficientes</span>
                            )}
                          </div>
                          <div>
                            <TrendMark trend={c.trend} />
                          </div>
                          <div>
                            <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", st.cls)}>
                              {st.icon}
                              {st.label}
                            </span>
                          </div>
                        </div>
                      );
                      return (
                        <li key={c.capabilityId} className="border-t border-line first:border-t-0">
                          {c.findingId ? (
                            <a href={`/docente/c/${sectionId}/hallazgos/${c.findingId}`} className="block hover:bg-canvas">
                              {row}
                            </a>
                          ) : (
                            row
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </Card>
          ))}
        </section>
      ))}
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <CircleDashed className="size-4" aria-hidden /> El denominador siempre son los estudiantes con evidencia suficiente sobre esa capacidad, no todos los inscriptos.
      </p>
    </div>
  );
}
