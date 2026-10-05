"use client";

import { RouteError } from "@/ui/route-error";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-4">
      <RouteError error={error} reset={reset} home="/" />
    </main>
  );
}
