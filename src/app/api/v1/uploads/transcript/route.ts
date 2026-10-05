import { handle } from "@/lib/api";
import { uploadTranscript } from "@/modules/sources/import";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";

/** POST /v1/uploads (purpose=external_ai_transcript) + complete, simplificado: el archivo viaja en el mismo request. */
export async function POST(req: Request) {
  return handle(async ({ db, user }) => {
    const form = await req.formData();
    const sectionId = String(form.get("sectionId") ?? "");
    const file = form.get("file");
    const pasted = String(form.get("text") ?? "");
    let payload: { name: string; content: string; size: number };
    if (file && typeof file !== "string" && file.size > 0) {
      payload = { name: file.name, content: await file.text(), size: file.size };
    } else if (pasted.trim()) {
      payload = { name: "conversacion-pegada.md", content: pasted, size: Buffer.byteLength(pasted) };
    } else {
      throw new DomainError("VALIDATION", "Elegí un archivo .txt o .md, o pegá la conversación.");
    }
    return uploadTranscript(db, user.id, sectionId, payload);
  }, "student")();
}
