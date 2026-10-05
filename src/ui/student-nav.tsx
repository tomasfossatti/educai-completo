"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, UserRound } from "lucide-react";
import { cx } from "./primitives";

const ITEMS = [
  { href: "/estudiante", label: "Inicio", icon: Home, exact: true },
  { href: "/estudiante/materias", label: "Mis materias", icon: BookOpen },
  { href: "/estudiante/perfil", label: "Mi perfil", icon: UserRound },
];

function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));
}

/** Navegación global estudiante (UX §3): Inicio · Mis materias · Mi perfil. */
export function StudentTopNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={isActive(it.href, it.exact) ? "page" : undefined}
          className={cx(
            "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
            isActive(it.href, it.exact) ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:text-ink",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function StudentBottomNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid grid-cols-3">
        {ITEMS.map((it) => {
          const active = isActive(it.href, it.exact);
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", active ? "text-brand-700" : "text-ink-muted")}
              >
                <Icon className="size-5" aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
