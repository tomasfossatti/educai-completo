"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./primitives";

/** Navegación dentro de la cátedra (UX §25). */
export function TeacherTabs({ sectionId }: { sectionId: string }) {
  const path = usePathname();
  const base = `/docente/c/${sectionId}`;
  const tabs = [
    { href: base, label: "Inicio", match: (p: string) => p === base || p.startsWith(`${base}/hallazgos`) || p.startsWith(`${base}/preparar`) },
    { href: `${base}/mapa`, label: "Mapa de aprendizaje", match: (p: string) => p.startsWith(`${base}/mapa`) },
    { href: `${base}/experiencias`, label: "Experiencias", match: (p: string) => p.startsWith(`${base}/experiencias`) || p.startsWith(`${base}/lanzamientos`) },
    { href: `${base}/cronograma`, label: "Cronograma", match: (p: string) => p.startsWith(`${base}/cronograma`) },
    { href: `${base}/aula`, label: "Tu aula", match: (p: string) => p.startsWith(`${base}/aula`) },
  ];
  return (
    <nav aria-label="Secciones de la cátedra" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
