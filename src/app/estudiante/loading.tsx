import { Skeleton } from "@/ui/states";

export default function StudentLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-5 w-32 rounded" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-5 w-40 rounded" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
