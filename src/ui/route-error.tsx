"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, LinkButton } from "./primitives";
import { ErrorNotice } from "./states";

/** Error de ruta (UX §46): explica qué pasó, conserva la navegación y ofrece reintentar. */
export function RouteError({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl py-8">
      <ErrorNotice
        title="No pudimos cargar esta pantalla."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Reintentar
            </Button>
            <LinkButton href={home} size="sm" variant="secondary">
              Volver al inicio
            </LinkButton>
          </div>
        }
      >
        Tus datos no se perdieron. Puede ser un problema momentáneo de conexión con el servidor.
      </ErrorNotice>
    </div>
  );
}
