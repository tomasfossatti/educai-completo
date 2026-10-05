import { handle } from "@/lib/api";
import { getTeacherHome } from "@/modules/teacher-projection/service";

export const dynamic = "force-dynamic";

/** GET /v1/teacher/course-sections/{id}/home (API:442-467). Nunca contiene estudiante + estado. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async ({ db, user }) => getTeacherHome(db, user.id, id), "teacher")();
}
