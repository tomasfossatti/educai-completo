"use client";

import { RouteError } from "@/ui/route-error";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} home="/estudiante" />;
}
