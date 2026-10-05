import { desc, eq } from "drizzle-orm";
import { Eye, EyeOff, Fingerprint, ShieldCheck } from "lucide-react";
import { getDb } from "@/db/client";
import { profileVersions } from "@/db/schema";
import { requireStudent } from "@/modules/identity/session";
import { listMySources } from "@/modules/sources/service";
import { track } from "@/modules/shared/outbox";
import { Card, Pill, SectionTitle } from "@/ui/primitives";
import { DeleteSourceButton } from "./delete-source";

export const metadata = { title: "Mi perfil" };

const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Cordoba" });

/** S-50 Mi perfil (global) + S-60 Tus datos / privacidad. */
export default async function PerfilPage() {
  const user = await requireStudent();
  const db = await getDb();
  const [profile] = await db.select().from(profileVersions).where(eq(profileVersions.studentUserId, user.id)).orderBy(desc(profileVersions.versionNo)).limit(1);
  const sources = await listMySources(db, user.id);
  await track(db, "profile_viewed", { userId: user.id });
  const p = profile?.profilePayload ?? {};

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{user.displayName}</h1>
        <p className="text-[15px] text-ink-soft">
          {p.career} · {p.stage}
        </p>
      </header>

      <section aria-labelledby="perfil">
        <SectionTitle id="perfil">Tu combinación actual</SectionTitle>
        <Card className="space-y-3 p-4 sm:p-5">
          {p.archetypes?.length ? (
            <div className="flex flex-wrap gap-2">
              {p.archetypes.map((a) => (
                <Pill key={a} tone="brand">
                  {a}
                </Pill>
              ))}
            </div>
          ) : null}
          {p.professionalHypothesis && <p className="text-[15px] leading-relaxed">Tus respuestas y experiencias actuales sugieren: {p.professionalHypothesis.charAt(0).toLowerCase()}{p.professionalHypothesis.slice(1)}</p>}
          {p.interests?.length ? (
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">Intereses que declaraste: </span>
              {p.interests.join(", ")}
            </p>
          ) : null}
          {p.openQuestions?.length ? (
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">Qué todavía estamos explorando: </span>
              {p.openQuestions.join(" ")}
            </p>
          ) : null}
          <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-soft">No es una identidad definitiva. Es una hipótesis construida con la evidencia que tenemos hoy.</p>
        </Card>
      </section>

      <section aria-labelledby="docente">
        <SectionTitle id="docente">Qué puede ver tu docente</SectionTitle>
        <Card className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-solid-700">
              <Eye className="size-4" aria-hidden /> Puede ver
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              <li>Porcentajes y patrones del aula, nunca por persona.</li>
              <li>Ejemplos anónimos, solo si los comparten 5 o más estudiantes.</li>
              <li>Cuántos participaron en una actividad.</li>
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <EyeOff className="size-4" aria-hidden /> No puede ver
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              <li>Tu nombre asociado a errores o estados.</li>
              <li>Tus conversaciones con el tutor.</li>
              <li>Tu perfil personal ni tus respuestas individuales.</li>
            </ul>
          </div>
        </Card>
      </section>

      <section aria-labelledby="datos">
        <SectionTitle id="datos">Tus datos y fuentes de evidencia</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">Cada fuente muestra cuánta evidencia aportó. Si eliminás una conversación, recalculamos todo lo que dependía de ella.</p>
        <Card className="divide-y divide-line">
          {sources.map((s) => (
            <div key={s.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug [overflow-wrap:anywhere]">{s.title}</p>
                  <p className="text-sm text-ink-muted">
                    {s.typeLabel} · {s.subjectName} · {fmt(new Date(s.createdAt))} · {s.evidenceCount} {s.evidenceCount === 1 ? "evidencia" : "evidencias"}
                  </p>
                </div>
                {s.deletable && <DeleteSourceButton id={s.id} title={s.title} />}
              </div>
            </div>
          ))}
          {sources.length === 0 && <p className="px-4 py-3 text-sm text-ink-muted">Todavía no hay fuentes.</p>}
        </Card>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <ShieldCheck className="size-4" aria-hidden /> Las actividades de cátedra se conservan para la evidencia del curso. <Fingerprint className="size-4" aria-hidden /> Tu identidad no viaja a las vistas docentes.
        </p>
      </section>
    </div>
  );
}
