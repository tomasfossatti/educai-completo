import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
process.env.PGLITE_DIR = "memory";
process.env.EDUCAI_AI = "off";
process.env.DEMO_MODE = "true";
import { closeDb, getDb, type DB } from "@/db/client";
import { capabilities, capabilityInterpretations, users } from "@/db/schema";
import { DEMO_DOMAIN, demoUserIds } from "@/db/seed/demo";
import { SAMPLE_PROGRAM_TEXT } from "@/modules/curriculum/demo-curriculum";
import { activateDraft, createSectionFromProgram, getDraft } from "@/modules/curriculum/setup";
import { getCurriculum } from "@/modules/curriculum/service";
import { confirmTranscript, getUploadSummary, uploadTranscript } from "@/modules/sources/import";
import { deleteMySource } from "@/modules/sources/service";
import { getTeacherHome } from "@/modules/teacher-projection/service";
import { DomainError } from "@/modules/shared/errors";

/** Crear cátedra desde un programa (T-01..T-03) e importar una conversación externa (S-31). */

let db: DB;
let ids: Awaited<ReturnType<typeof demoUserIds>>;

beforeAll(async () => {
  db = await getDb();
  ids = await demoUserIds(db);
});
afterAll(async () => closeDb());

describe("Crear cátedra desde el programa", () => {
  let sectionId: string;

  it("propone una currícula que el docente valida antes de activar", async () => {
    const r = await createSectionFromProgram(db, ids.teacherId!, {
      subjectName: "Gestión Ágil de Proyectos",
      sectionName: "Comisión B",
      term: "2° cuatrimestre 2026",
      classes: 12,
      approxStudents: 30,
      examDate: null,
      program: { filename: "programa.txt", mime: "text/plain", size: SAMPLE_PROGRAM_TEXT.length, text: SAMPLE_PROGRAM_TEXT, pages: null },
    });
    sectionId = r.sectionId;
    expect(r.extractor).toBe("heuristic");
    const draft = (await getDraft(db, ids.teacherId!, sectionId))!;
    expect(draft.draft.units).toHaveLength(3);
    // Antes de activar no hay capacidades: la propuesta es solo un borrador.
    expect(await db.select().from(capabilities).where(eq(capabilities.courseSectionId, sectionId))).toHaveLength(0);
  });

  it("al activar crea capacidades y la cátedra arranca sin hallazgos inventados", async () => {
    const draft = (await getDraft(db, ids.teacherId!, sectionId))!;
    draft.draft.units[0].topics[0].capabilities[0].statement = "Explicar los valores del Manifiesto ágil";
    await activateDraft(db, ids.teacherId!, sectionId, draft.draft);
    const { capabilities: caps } = await getCurriculum(db, sectionId);
    expect(caps.length).toBeGreaterThanOrEqual(8);
    expect(caps.some((c) => c.statement === "Explicar los valores del Manifiesto ágil")).toBe(true);
    const home = await getTeacherHome(db, ids.teacherId!, sectionId);
    expect(home.state).toBe("no_evidence");
    expect(home.coverage.enrolled).toBe(0);
    // Sin IA y sin banco curado no se ofrece generar una experiencia que fallaría.
    expect(home.recommended?.generationAvailable).toBe(false);
  });

  it("otro docente no puede ver ni activar la cátedra", async () => {
    const [diego] = await db.select().from(users).where(eq(users.email, `diego.paz@${DEMO_DOMAIN}`));
    await expect(getTeacherHome(db, diego.id, sectionId)).rejects.toBeInstanceOf(DomainError);
    await expect(getDraft(db, diego.id, sectionId)).rejects.toBeInstanceOf(DomainError);
  });
});

describe("Importar una conversación con otra IA", () => {
  const content = readFileSync("public/demo/conversacion-retrospectiva.md", "utf8");
  let uploadId: string;
  let retroId: string;

  const retroState = async () => {
    const [row] = await db
      .select()
      .from(capabilityInterpretations)
      .where(and(eq(capabilityInterpretations.studentUserId, ids.studentId!), eq(capabilityInterpretations.capabilityId, retroId)));
    return row?.visibleState ?? "unknown";
  };

  it("detecta roles y temas, y pide confirmación antes de usarla", async () => {
    const [cap] = await db.select().from(capabilities).where(and(eq(capabilities.courseSectionId, ids.sectionId!), eq(capabilities.stableKey, "CAP-EV-02")));
    retroId = cap.id;
    expect(await retroState()).toBe("unknown");
    const up = await uploadTranscript(db, ids.studentId!, ids.sectionId!, { name: "conversacion-retrospectiva.md", content, size: content.length });
    uploadId = up.uploadId;
    const s = await getUploadSummary(db, ids.studentId!, uploadId);
    expect(s.status).toBe("needs_confirmation");
    expect(s.studentTurns).toBe(3);
    expect(s.topics.map((t) => t.id)).toContain(retroId);
    expect(await retroState()).toBe("unknown");
  });

  it("al confirmar genera evidencia propia del estudiante y cambia el estado", async () => {
    const r = await confirmTranscript(db, ids.studentId!, uploadId);
    // Las preguntas del estudiante y las respuestas de la IA no cuentan como evidencia.
    expect(r.evidenceCount).toBe(2);
    expect(r.skippedQuestions).toBeGreaterThanOrEqual(1);
    expect(r.transitions.find((t) => t.capabilityId === retroId)).toMatchObject({ from: "unknown", to: "in_development" });
    expect(await retroState()).toBe("in_development");
  });

  it("no cuenta dos veces la misma conversación", async () => {
    await expect(uploadTranscript(db, ids.studentId!, ids.sectionId!, { name: "copia.md", content, size: content.length })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("borrarla revierte el estado que dependía de ella", async () => {
    await deleteMySource(db, ids.studentId!, uploadId);
    expect(await retroState()).toBe("unknown");
  });
});
