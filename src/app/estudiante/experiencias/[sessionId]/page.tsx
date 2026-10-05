import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireStudent } from "@/modules/identity/session";
import { getSessionForPlayer } from "@/modules/experience/service";
import { DomainError } from "@/modules/shared/errors";
import { ExperiencePlayer, type PlayerView } from "./player";

export const metadata = { title: "Experiencia" };

export default async function ExperiencePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireStudent();
  const db = await getDb();
  try {
    const view = await getSessionForPlayer(db, user.id, sessionId);
    return <ExperiencePlayer initial={JSON.parse(JSON.stringify(view)) as PlayerView} />;
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
