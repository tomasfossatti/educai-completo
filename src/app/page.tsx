import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/identity/session";

export const dynamic = "force-dynamic";

/** S-00: routing según sesión. */
export default async function Root() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  redirect(user.role === "teacher" ? "/docente" : "/estudiante");
}
