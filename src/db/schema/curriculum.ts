import { integer, jsonb, pgTable, primaryKey, text, uniqueIndex, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { CognitiveLevel, Importance } from "@/modules/shared/enums";
import { createdAt, id, ts } from "./_shared";
import type { DraftCurriculum } from "@/modules/curriculum/extract";
import { courseSections } from "./identity";

// ── Curriculum (DM §5) ──────────────────────────────────────────────────────
export const curriculumVersions = pgTable(
  "curriculum_versions",
  {
    id: id(),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    versionNo: integer("version_no").notNull(),
    status: text("status")
      .$type<"draft" | "proposed" | "active" | "superseded" | "invalidated">()
      .notNull()
      .default("draft"),
    source: text("source").$type<"seed" | "program_upload" | "teacher">().notNull().default("teacher"),
    /** Propuesta editable antes de activar (PATCH curriculum/draft, API:473-479). */
    draft: jsonb("draft").$type<DraftCurriculum>(),
    extractor: text("extractor"),
    activatedAt: ts("activated_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("curriculum_versions_no_uq").on(t.courseSectionId, t.versionNo),
    // Una sola currícula activa por cátedra (DM:271-275).
    uniqueIndex("curriculum_versions_active_uq").on(t.courseSectionId).where(sql`status = 'active'`),
  ],
);

export const curriculumNodes = pgTable(
  "curriculum_nodes",
  {
    id: id(),
    curriculumVersionId: uuid("curriculum_version_id").notNull().references(() => curriculumVersions.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    parentId: uuid("parent_id"),
    nodeType: text("node_type").$type<"module" | "unit" | "reading" | "topic" | "subtopic">().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Clase en la que el cronograma introduce este nodo; permite derivar schedule status (R:651-657). */
    plannedClassNo: integer("planned_class_no"),
    provenance: text("provenance")
      .$type<"official_explicit" | "derived_from_material" | "teacher_added">()
      .notNull()
      .default("official_explicit"),
    status: text("status").$type<"active" | "superseded" | "removed">().notNull().default("active"),
  },
  (t) => [index("curriculum_nodes_tree_idx").on(t.curriculumVersionId, t.parentId, t.sortOrder)],
);

/** label: redacción para docentes (tercera persona). studentLabel: redacción para el estudiante (segunda persona). */
export type KnownErrorType = { key: string; label: string; description: string; studentLabel?: string };

export const capabilities = pgTable(
  "capabilities",
  {
    id: id(),
    curriculumVersionId: uuid("curriculum_version_id").notNull().references(() => curriculumVersions.id),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    nodeId: uuid("node_id").notNull().references(() => curriculumNodes.id),
    stableKey: text("stable_key").notNull(),
    statement: text("statement").notNull(),
    /** Versión corta para listas y tarjetas. */
    shortLabel: text("short_label").notNull(),
    /** Explicación simple para el estudiante (S-23). */
    studentExplanation: text("student_explanation"),
    actionVerb: text("action_verb"),
    targetCognitiveLevel: text("target_cognitive_level").$type<CognitiveLevel>().notNull(),
    importance: text("importance").$type<Importance>().notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Clase del cronograma en la que se introduce la capacidad (deriva schedule status, R:651-657). */
    plannedClassNo: integer("planned_class_no"),
    /**
     * Catálogo de errores frecuentes declarado por la currícula / experiencias instrumentadas (C:762-773).
     * Extensión del modelo documentada en MVP_Demo_Decisions.md.
     */
    knownErrorTypes: jsonb("known_error_types").$type<KnownErrorType[]>().notNull().default([]),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    provenance: text("provenance").$type<"official_explicit" | "derived" | "teacher_added">().notNull().default("official_explicit"),
    status: text("status").$type<"active" | "superseded" | "removed">().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("capabilities_key_uq").on(t.curriculumVersionId, t.stableKey),
    index("capabilities_section_idx").on(t.courseSectionId, t.status),
  ],
);

export const capabilityPrerequisites = pgTable(
  "capability_prerequisites",
  {
    capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
    prerequisiteCapabilityId: uuid("prerequisite_capability_id").notNull().references(() => capabilities.id),
    criticality: text("criticality").$type<"low" | "medium" | "high">().notNull().default("medium"),
  },
  (t) => [primaryKey({ columns: [t.capabilityId, t.prerequisiteCapabilityId] })],
);

export const materials = pgTable("materials", {
  id: id(),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  materialType: text("material_type").$type<"program" | "pdf" | "doc" | "other">().notNull().default("program"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  contentHash: text("content_hash").notNull(),
  extractedText: text("extracted_text"),
  pageCount: integer("page_count"),
  status: text("status").$type<"uploaded" | "processing" | "ready" | "warning" | "failed" | "removed">().notNull(),
  warning: text("warning"),
  createdAt: createdAt(),
});
