import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, Radio, Telescope } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getLaunchLive, getLaunchResult } from "@/modules/experience/service";
import { demoModeEnabled } from "@/modules/demo/simulate";
import { DomainError } from "@/modules/shared/errors";
import { baseUrl } from "@/lib/base-url";
import { Card, Eyebrow, LinkButton } from "@/ui/primitives";
import { PrivacyNotice } from "@/ui/academic";
import { LaunchLive } from "./live";

export const metadata = { title: "Experiencia en vivo" };

/** T-62 Lanzar · T-63 En vivo · T-64 Resultado "Qué observamos". */
export default async function LaunchPage({ params }: { params: Promise<{ sectionId: string; launchId: string }> }) {
  const { sectionId, launchId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  let live;
  try {
    live = await getLaunchLive(db, user.id, launchId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  const base = `/docente/c/${sectionId}`;
  const link = `${await baseUrl()}/x/${live.joinCode}`;

  if (live.status !== "open") {
    const r = await getLaunchResult(db, user.id, launchId);
    const improved = r.before.ratePct !== null && r.after.ratePct !== null && r.after.ratePct < r.before.ratePct;
    return (
      <div className="space-y-6">
        <a href={`${base}/experiencias`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Experiencias
        </a>
        <header>
          <Eyebrow>Qué observamos</Eyebrow>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{r.title}</h2>
          <p className="mt-1 text-[15px] text-ink-soft">
            Participaron {r.participants} estudiantes · {r.completed} completaron la experiencia.
          </p>
        </header>

        <Card className="p-6">
          <p className="text-sm font-semibold text-ink-soft">{r.capability.label} · necesitan revisar</p>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Antes</p>
              <p className="text-5xl font-bold tabular-nums text-ink-soft">{r.before.ratePct !== null ? `${r.before.ratePct}%` : "—"}</p>
              <p className="text-sm text-ink-muted">
                {r.before.numerator} de {r.before.denominator} con evidencia suficiente
              </p>
            </div>
            <ArrowRight className="mb-8 size-6 text-ink-muted" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Ahora</p>
              <p className={`text-5xl font-bold tabular-nums ${improved ? "text-solid-700" : "text-attention-700"}`}>{r.after.ratePct !== null ? `${r.after.ratePct}%` : "—"}</p>
              <p className="text-sm text-ink-muted">
                {r.after.numerator} de {r.after.denominator} con evidencia suficiente
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px] text-ink-soft">
            {improved
              ? "Se observó una mejora después de la experiencia. La cobertura también creció: ahora hay más estudiantes con evidencia suficiente para esta capacidad."
              : "Con la evidencia nueva todavía no se observa una mejora. Conviene una segunda intervención con otro formato."}
          </p>
          <p className="mt-2 text-xs text-ink-muted">Hablamos de lo observado durante el período, no de causalidad.</p>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm font-semibold">Dificultad que persiste</p>
            {r.patterns.length ? (
              <ul className="mt-3 space-y-2 text-[15px]">
                {r.patterns.map((p) => (
                  <li key={p.label} className="flex items-start justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{p.count} est.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2">
                <PrivacyNotice>No queda un patrón compartido por 5 o más estudiantes.</PrivacyNotice>
              </div>
            )}
            {r.hardestStep && (
              <p className="mt-4 text-sm text-ink-soft">
                <span className="font-semibold text-ink">Situación con más dispersión: </span>“{r.hardestStep.question}” ({r.hardestStep.correctPct}% eligió la opción adecuada). Es una buena pregunta para la puesta en común.
              </p>
            )}
          </Card>
          <Card className="flex flex-col p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Telescope className="size-4 text-brand-600" aria-hidden /> Próxima intervención sugerida
            </p>
            {r.nextIntervention ? (
              <>
                <p className="mt-3 text-lg font-semibold leading-snug">{r.nextIntervention.headline}</p>
                <p className="mt-1 text-[15px] text-ink-soft">{r.nextIntervention.detail}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {r.nextIntervention.findingId && <LinkButton href={`${base}/hallazgos/${r.nextIntervention.findingId}`}>Ver el hallazgo</LinkButton>}
                  <LinkButton href={base} variant="secondary">
                    Volver al inicio
                  </LinkButton>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">No aparece una dificultad prioritaria con la evidencia actual.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#16182b", light: "#ffffff" } });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            <Radio className="size-3.5 animate-pulse" aria-hidden /> En vivo
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">{live.title}</h2>
        </div>
      </div>
      <LaunchLive initial={live} qrSvg={qrSvg} link={link} demoMode={demoModeEnabled()} />
    </div>
  );
}
