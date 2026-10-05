import { handle } from "@/lib/api";
import { createSectionFromProgram, readProgramFile } from "@/modules/curriculum/setup";
import { SAMPLE_PROGRAM_TEXT } from "@/modules/curriculum/demo-curriculum";
import { DomainError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** T-01/T-02: crear cátedra con su programa → propuesta curricular. */
export async function POST(req: Request) {
  return handle(async ({ db, user }) => {
    const form = await req.formData();
    const subjectName = String(form.get("subjectName") ?? "").trim();
    if (subjectName.length < 3) throw new DomainError("VALIDATION", "Escribí el nombre de la materia.");
    const file = form.get("program");
    const pasted = String(form.get("programText") ?? "");
    const useSample = form.get("useSample") === "on";
    let program: { filename: string; mime: string; size: number; text: string; pages: number | null };
    if (useSample) {
      program = { filename: "programa-ejemplo.txt", mime: "text/plain", size: SAMPLE_PROGRAM_TEXT.length, text: SAMPLE_PROGRAM_TEXT, pages: null };
    } else if (file && typeof file !== "string" && file.size > 0) {
      const r = await readProgramFile(file);
      program = { filename: file.name, mime: file.type || "application/octet-stream", size: file.size, text: r.text, pages: r.pages };
    } else if (pasted.trim().length > 20) {
      program = { filename: "programa-pegado.txt", mime: "text/plain", size: pasted.length, text: pasted, pages: null };
    } else {
      throw new DomainError("VALIDATION", "Subí el programa, pegá su texto o usá el programa de ejemplo.");
    }
    if (program.text.trim().length < 20) throw new DomainError("VALIDATION", "No pudimos leer texto en el archivo. Si es un PDF escaneado, pegá el texto del programa.");
    const classes = Math.min(30, Math.max(4, Number(form.get("classes") ?? 12) || 12));
    return createSectionFromProgram(db, user.id, {
      subjectName,
      sectionName: String(form.get("sectionName") ?? "").trim() || "Comisión A",
      term: String(form.get("term") ?? "").trim() || "2° cuatrimestre 2026",
      classes,
      approxStudents: Number(form.get("approxStudents") ?? 30) || 30,
      examDate: String(form.get("examDate") ?? "") || null,
      program,
    });
  }, "teacher")();
}
