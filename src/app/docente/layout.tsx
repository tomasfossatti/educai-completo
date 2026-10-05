import { LogOut } from "lucide-react";
import { Logo } from "@/ui/brand";
import { requireTeacher } from "@/modules/identity/session";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  return (
    <div className="min-h-dvh pb-12">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/docente" subtitle="Docentes" />
          <div className="flex items-center gap-3">
            <a href="/docente" className="hidden text-sm font-semibold text-ink-soft hover:text-ink sm:inline">
              Mis cátedras
            </a>
            <span className="hidden text-sm text-ink-muted md:inline">{user.displayName}</span>
            <form method="post" action="/api/v1/auth/logout">
              <button className="grid size-9 place-items-center rounded-md text-ink-muted hover:bg-unknown-50 hover:text-ink" aria-label="Salir" title="Salir">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
