import { ArrowRight, GraduationCap, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { Logo } from "@/ui/brand";
import { Card } from "@/ui/primitives";
import { DEMO_STUDENT2_EMAIL, DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "@/db/seed/demo";
import { demoModeEnabled } from "@/modules/demo/simulate";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ingresar" };

const PERSONAS = [
  {
    email: DEMO_TEACHER_EMAIL,
    role: "teacher",
    name: "Ana Torres",
    who: "Docente",
    detail: "Innovación de Procesos y Diseño de Proyectos · Comisión A · 36 estudiantes",
    icon: <GraduationCap className="size-5" aria-hidden />,
  },
  {
    email: DEMO_STUDENT_EMAIL,
    role: "student",
    name: "Lucía Fernández",
    who: "Estudiante",
    detail: "Cursa Innovación de Procesos y Estadística Aplicada",
    icon: <UserRound className="size-5" aria-hidden />,
  },
  {
    email: DEMO_STUDENT2_EMAIL,
    role: "student",
    name: "Nicolás Herrera",
    who: "Estudiante",
    detail: "Mismo curso, otro momento del aprendizaje",
    icon: <UserRound className="size-5" aria-hidden />,
  },
] as const;

export default async function EntrarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await getDb(); // garantiza migraciones + escenario demo antes del primer ingreso
  const next = sp.next ?? "";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:py-14">
      <Logo href="/entrar" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <section className="rise">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="size-3.5" aria-hidden /> Demo · Cátedra precargada con evidencia
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Lo que pasa en el aula, convertido en la próxima mejor decisión.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            Educai observa experiencias de aprendizaje, las convierte en evidencia y recomienda qué hacer a continuación: al estudiante, su
            próximo paso; a la docente, qué necesita su aula.
          </p>
          <ol className="mt-6 grid max-w-xl grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {["Experiencia", "Evidencia", "Interpretación", "Recomendación", "Nueva experiencia"].map((s, i) => (
              <li key={s} className="rounded-md border border-line bg-surface px-2.5 py-2 text-center font-medium text-ink-soft">
                <span className="block text-[11px] font-semibold text-brand-600">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ingresar" className="rise">
          <h2 id="ingresar" className="text-sm font-semibold text-ink-soft">
            Elegí con quién ingresar
          </h2>
          {sp.error && (
            <p role="alert" className="mt-3 rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">
              No pudimos ingresar con ese perfil. Probá con otro o reiniciá la demo.
            </p>
          )}
          {sp.reiniciado && (
            <p className="mt-3 rounded-md bg-solid-50 px-3 py-2 text-sm text-solid-700">La demo volvió a su estado inicial.</p>
          )}
          <ul className="mt-3 space-y-3">
            {PERSONAS.map((p) => (
              <li key={p.email}>
                <form method="post" action="/api/v1/auth/demo-login">
                  <input type="hidden" name="email" value={p.email} />
                  <input type="hidden" name="role" value={p.role} />
                  <input type="hidden" name="next" value={next} />
                  <button className="group w-full text-left" type="submit">
                    <Card as="div" className="flex items-center gap-4 p-4 transition-shadow group-hover:shadow-[var(--shadow-raised)] group-focus-visible:shadow-[var(--shadow-raised)]">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${p.role === "teacher" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}>
                        {p.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">{p.who}</span>
                        <span className="block text-base font-semibold">{p.name}</span>
                        <span className="block truncate text-sm text-ink-muted">{p.detail}</span>
                      </span>
                      <ArrowRight className="size-5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
                    </Card>
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
            Para mostrar el loop completo, abrí la docente en una ventana y a Lucía en otra (o en una ventana privada).
          </p>
          {demoModeEnabled() && (
            <form method="post" action="/api/v1/demo/reset" className="mt-6">
              <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand-700" type="submit">
                <RotateCcw className="size-4" aria-hidden /> Reiniciar demo
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
