import { Briefcase, Lock, Sparkles } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getClassroomProfile } from "@/modules/teacher-projection/service";
import { PrivacyNotice } from "@/ui/academic";
import { Card, SectionTitle } from "@/ui/primitives";

export const metadata = { title: "Tu aula" };

/** T-40 Tu aula: agregados únicamente, con supresión visible de celdas chicas. */
export default async function ClassroomPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  const p = await getClassroomProfile(db, user.id, sectionId);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tu aula</h2>
        <p className="text-[15px] text-ink-soft">Un perfil general del grupo para contextualizar ejemplos y actividades. Nunca identifica a nadie.</p>
      </div>
      {p.suppressed ? (
        <PrivacyNotice />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="intereses">
            <SectionTitle id="intereses">Intereses frecuentes</SectionTitle>
            <Card className="space-y-3 p-5">
              {p.interests.visible.map((i) => (
                <div key={i.label}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-brand-600" aria-hidden /> {i.label}
                    </span>
                    <span className="font-semibold tabular-nums">{i.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-unknown-50">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${i.pct}%` }} />
                  </div>
                </div>
              ))}
              {p.interests.hiddenCategories > 0 && <PrivacyNotice>Hay {p.interests.hiddenCategories} intereses con menos de 5 estudiantes que no mostramos.</PrivacyNotice>}
            </Card>
          </section>
          <section aria-labelledby="contexto">
            <SectionTitle id="contexto">Contexto profesional</SectionTitle>
            <Card className="space-y-3 p-5">
              {p.workingPct !== null && (
                <p className="flex items-center gap-2 text-[15px]">
                  <Briefcase className="size-4 text-ink-muted" aria-hidden /> <strong>{p.workingPct}%</strong> trabaja además de estudiar.
                </p>
              )}
              <p className="text-sm font-semibold text-ink-soft">Áreas en las que tienen experiencia</p>
              <ul className="space-y-1.5 text-[15px]">
                {p.exposure.visible.map((e) => (
                  <li key={e.label} className="flex justify-between">
                    <span>{e.label}</span>
                    <span className="font-semibold tabular-nums">{e.pct}%</span>
                  </li>
                ))}
              </ul>
              {p.exposure.hiddenCategories > 0 && <PrivacyNotice>Algunas áreas tienen menos de 5 estudiantes y no se muestran.</PrivacyNotice>}
            </Card>
          </section>
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-ink-muted">
        <Lock className="size-4" aria-hidden /> Basado en {p.respondents} perfiles de {p.enrolled} inscriptos. Los perfiles individuales son privados del estudiante.
      </p>
    </div>
  );
}
