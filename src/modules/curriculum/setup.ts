import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import {
  capabilities,
  classSessions,
  courseSections,
  courseSectionTeachers,
  curriculumNodes,
  curriculumVersions,
  institutionMemberships,
  materials,
  milestones,
  subjects,
} from "@/db/schema";
import { COGNITIVE_LEVELS } from "@/modules/shared/enums";
import { DomainError, notFound } from "@/modules/shared/errors";
import { assertTeacherOfSection, generateCode } from "@/modules/academic/service";
import { extractCurriculumWithAI } from "@/modules/ai-gateway/tasks/extract-curriculum";
import { refreshProjection } from "@/modules/teacher-projection/service";
import { emit, track } from "@/modules/shared/outbox";
import { keywordsOf, parseProgram, type DraftCurriculum } from "./extract";

/** T-01/T-02: crear cátedra + leer el programa + proponer currícula (estado `proposed`). */
export async function createSectionFromProgram(
  db: DB,
  teacherId: string,
  input: {
    subjectName: string;
    sectionName: string;
    term: string;
    classes: number;
    approxStudents: number;
    examDate: string | null;
    program: { filename: string; mime: string; size: number; text: string; pages: number | null };
  },
) {
  const [membership] = await db.select().from(institutionMemberships).where(eq(institutionMemberships.userId, teacherId)).limit(1);
  if (!membership) throw new DomainError("FORBIDDEN", "Tu usuario no pertenece a una institución.");
  const [subject] = await db.insert(subjects).values({ institutionId: membership.institutionId, name: input.subjectName }).returning();
  let code = generateCode(6);
  for (let i = 0; i < 5; i++) {
    const [exists] = await db.select({ id: courseSections.id }).from(courseSections).where(eq(courseSections.joinCode, code)).limit(1);
    if (!exists) break;
    code = generateCode(6);
  }
  const [section] = await db
    .insert(courseSections)
    .values({
      subjectId: subject.id,
      institutionId: membership.institutionId,
      name: input.sectionName,
      term: input.term,
      status: "draft",
      joinCode: code,
      classroomContext: { approxStudents: input.approxStudents, classMinutes: 120, devices: ["celulares"] },
    })
    .returning();
  await db.insert(courseSectionTeachers).values({ courseSectionId: section.id, teacherUserId: teacherId, role: "owner" });

  const text = input.program.text.trim();
  const lowText = input.program.pages ? text.length / input.program.pages < 200 : false;
  await db.insert(materials).values({
    courseSectionId: section.id,
    materialType: "program",
    filename: input.program.filename,
    mimeType: input.program.mime,
    sizeBytes: input.program.size,
    contentHash: createHash("sha256").update(text).digest("hex"),
    extractedText: text,
    pageCount: input.program.pages,
    status: lowText ? "warning" : "ready",
    warning: lowText ? "Pudimos leer el documento, pero algunas páginas tienen poco texto detectable." : null,
  });

  let draft = await extractCurriculumWithAI({ db, courseSectionId: section.id, subjectName: input.subjectName, programText: text });
  let extractor = "llm";
  if (!draft || draft.units.length === 0) {
    draft = parseProgram(text);
    extractor = "heuristic";
  }
  if (draft.units.length === 0) throw new DomainError("VALIDATION", "No pudimos reconocer unidades ni temas en el programa. Probá pegar el texto con una línea por tema.");
  await db.insert(curriculumVersions).values({ courseSectionId: section.id, versionNo: 1, status: "proposed", source: "program_upload", draft, extractor });

  // Cronograma y hito se guardan ya; la currícula se activa cuando el docente valida.
  const start = new Date();
  start.setUTCHours(22, 0, 0, 0);
  for (let k = 1; k <= input.classes; k++) {
    const d = new Date(start.getTime() + (k - 1) * 7 * 86_400_000);
    await db.insert(classSessions).values({ courseSectionId: section.id, sequenceNo: k, plannedDate: d.toISOString().slice(0, 10), title: `Clase ${k}`, status: k === 1 ? "open" : "planned" });
  }
  if (input.examDate) await db.insert(milestones).values({ courseSectionId: section.id, type: "exam", title: "1° Parcial", dueAt: new Date(`${input.examDate}T22:00:00Z`) });
  await track(db, "course_section_created", { userId: teacherId, courseSectionId: section.id, properties: { extractor } });
  return { sectionId: section.id, extractor, warning: lowText };
}

export async function getDraft(db: DB, teacherId: string, sectionId: string) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const [v] = await db
    .select()
    .from(curriculumVersions)
    .where(and(eq(curriculumVersions.courseSectionId, sectionId), eq(curriculumVersions.status, "proposed")))
    .limit(1);
  const [m] = await db.select().from(materials).where(eq(materials.courseSectionId, sectionId)).limit(1);
  const [section] = await db.select().from(courseSections).where(eq(courseSections.id, sectionId)).limit(1);
  return v ? { versionId: v.id, draft: v.draft!, extractor: v.extractor, material: m ?? null, joinCode: section.joinCode } : null;
}

const DraftSchema = z.object({
  units: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(140),
        topics: z
          .array(
            z.object({
              title: z.string().trim().min(2).max(160),
              capabilities: z
                .array(z.object({ statement: z.string().trim().min(4).max(220), shortLabel: z.string().trim().min(2).max(60), level: z.enum(COGNITIVE_LEVELS), keywords: z.array(z.string()).max(8) }))
                .max(6),
            }),
          )
          .max(12),
      }),
    )
    .min(1)
    .max(12),
});

/** T-03 "Está correcto": activar crea la versión activa (una sola por cátedra, EDU-0207). */
export async function activateDraft(db: DB, teacherId: string, sectionId: string, edited: unknown) {
  await assertTeacherOfSection(db, teacherId, sectionId);
  const parsed = DraftSchema.safeParse(edited);
  if (!parsed.success) throw new DomainError("VALIDATION", "Revisá la currícula: hay unidades, temas o capacidades vacías.");
  const draft: DraftCurriculum = parsed.data;
  const capCount = draft.units.flatMap((u) => u.topics.flatMap((t) => t.capabilities)).length;
  if (capCount === 0) throw new DomainError("VALIDATION", "Agregá al menos una capacidad.");
  const [v] = await db
    .select()
    .from(curriculumVersions)
    .where(and(eq(curriculumVersions.courseSectionId, sectionId), eq(curriculumVersions.status, "proposed")))
    .limit(1);
  if (!v) throw notFound("Propuesta curricular");
  const sessions = await db.select().from(classSessions).where(eq(classSessions.courseSectionId, sectionId));
  const totalClasses = Math.max(1, sessions.length);
  const [mod] = await db
    .insert(curriculumNodes)
    .values({ curriculumVersionId: v.id, courseSectionId: sectionId, nodeType: "module", title: "Programa de la materia", sortOrder: 0, provenance: "derived_from_material" })
    .returning();
  let order = 0;
  for (const [ui, u] of draft.units.entries()) {
    const planned = Math.floor((ui * totalClasses) / draft.units.length) + 1;
    const [unit] = await db
      .insert(curriculumNodes)
      .values({ curriculumVersionId: v.id, courseSectionId: sectionId, parentId: mod.id, nodeType: "unit", title: u.title, sortOrder: ui, plannedClassNo: planned, provenance: "derived_from_material" })
      .returning();
    for (const [ti, t] of u.topics.entries()) {
      const [topic] = await db
        .insert(curriculumNodes)
        .values({ curriculumVersionId: v.id, courseSectionId: sectionId, parentId: unit.id, nodeType: "topic", title: t.title, sortOrder: ti, plannedClassNo: planned, provenance: "derived_from_material" })
        .returning();
      for (const c of t.capabilities) {
        order++;
        await db.insert(capabilities).values({
          curriculumVersionId: v.id,
          courseSectionId: sectionId,
          nodeId: topic.id,
          stableKey: `CAP-${String(order).padStart(2, "0")}`,
          statement: c.statement,
          shortLabel: c.shortLabel,
          targetCognitiveLevel: c.level,
          importance: c.level === "explain" ? "medium" : "high",
          sortOrder: order,
          plannedClassNo: planned,
          keywords: c.keywords.length ? c.keywords : keywordsOf(c.shortLabel),
          provenance: "derived",
        });
      }
    }
  }
  await db.update(curriculumVersions).set({ status: "active", activatedAt: new Date(), draft }).where(eq(curriculumVersions.id, v.id));
  await db.update(courseSections).set({ status: "active" }).where(eq(courseSections.id, sectionId));
  await emit(db, { eventType: "curriculum.version_activated", aggregateType: "curriculum_version", aggregateId: v.id, courseSectionId: sectionId });
  await track(db, "curriculum_map_confirmed", { userId: teacherId, courseSectionId: sectionId });
  await refreshProjection(db, sectionId);
  return { sectionId };
}

/** Texto del programa: PDF con unpdf (extracción de texto), TXT/MD directo. */
export async function readProgramFile(file: File): Promise<{ text: string; pages: number | null }> {
  if (file.size > 8_000_000) throw new DomainError("VALIDATION", "El archivo es demasiado grande (máximo 8 MB).");
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return { text: Array.isArray(text) ? text.join("\n") : text, pages: totalPages };
  }
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) return { text: await file.text(), pages: null };
  throw new DomainError("VALIDATION", "Formato no soportado: subí un PDF, TXT o MD.");
}
