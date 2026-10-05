import { LogOut } from "lucide-react";
import { Logo } from "@/ui/brand";
import { StudentBottomNav, StudentTopNav } from "@/ui/student-nav";
import { requireStudent } from "@/modules/identity/session";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  return (
    <div className="min-h-dvh pb-20 sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo href="/estudiante" />
          <StudentTopNav />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-soft md:inline">{user.displayName}</span>
            <form method="post" action="/api/v1/auth/logout">
              <button className="grid size-9 place-items-center rounded-md text-ink-muted hover:bg-unknown-50 hover:text-ink" aria-label="Salir" title="Salir">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-5">{children}</main>
      <StudentBottomNav />
    </div>
  );
}
