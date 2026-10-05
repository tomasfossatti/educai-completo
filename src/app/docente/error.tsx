"use client";

import { RouteError } from "@/ui/route-error";

export default function TeacherError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 sm:px-6">
      <RouteError error={error} reset={reset} home="/docente" />
    </div>
  );
}
