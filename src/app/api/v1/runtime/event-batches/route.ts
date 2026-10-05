import { handle, readJson } from "@/lib/api";
import { ingestEventBatch } from "@/modules/experience/service";

export const dynamic = "force-dynamic";

/** POST /v1/runtime/event-batches (API:601-633). El servidor agrega estudiante y cátedra: el cliente no puede elegirlos. */
export async function POST(req: Request) {
  return handle(async ({ db, user }) => ingestEventBatch(db, user.id, await readJson(req)), "student")();
}
