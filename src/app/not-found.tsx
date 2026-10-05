import { Compass } from "lucide-react";
import { Logo } from "@/ui/brand";
import { LinkButton } from "@/ui/primitives";

export const metadata = { title: "No encontrado" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <Logo href="/" />
      <div className="space-y-2">
        <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Compass className="size-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">No encontramos esta página</h1>
        <p className="text-[15px] text-ink-soft">Puede que el link esté incompleto, que la actividad ya haya cerrado o que no tengas acceso a esta cátedra.</p>
      </div>
      <LinkButton href="/">Ir al inicio</LinkButton>
    </main>
  );
}
