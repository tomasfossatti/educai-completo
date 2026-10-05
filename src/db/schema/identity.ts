import { jsonb, pgTable, primaryKey, text, uniqueIndex, integer, date, index, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, ts } from "./_shared";

// ── Identity & Access (DM §3) ───────────────────────────────────────────────
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  status: text("status").$type<"active" | "suspended" | "deleted">().notNull().default("active"),
  locale: text("locale").notNull().default("es-AR"),
  createdAt: createdAt(),
});

export const institutions = pgTable("institutions", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: createdAt(),
});

export const institutionMemberships = pgTable(
  "institution_memberships",
  {
    id: id(),
    institutionId: uuid("institution_id").notNull().references(() => institutions.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: text("role").$type<"teacher" | "institution_admin">().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("institution_memberships_uq").on(t.institutionId, t.userId, t.role)],
);

// ── Enrollment & Academic Structure (DM §4) ─────────────────────────────────
export const subjects = pgTable("subjects", {
  id: id(),
  institutionId: uuid("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  createdAt: createdAt(),
});

export type ClassroomContext = {
  approxStudents?: number;
  classMinutes?: number;
  devices?: string[];
  groupWork?: boolean;
};

export const courseSections = pgTable("course_sections", {
  id: id(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  institutionId: uuid("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  term: text("term").notNull(),
  status: text("status").$type<"draft" | "active" | "completed" | "archived">().notNull().default("draft"),
  joinCode: text("join_code").notNull().unique(),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  classroomContext: jsonb("classroom_context").$type<ClassroomContext>().notNull().default({}),
  createdAt: createdAt(),
});

export const courseSectionTeachers = pgTable(
  "course_section_teachers",
  {
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    teacherUserId: uuid("teacher_user_id").notNull().references(() => users.id),
    role: text("role").$type<"owner" | "teacher" | "assistant">().notNull().default("owner"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.courseSectionId, t.teacherUserId] })],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    studentUserId: uuid("student_user_id").notNull().references(() => users.id),
    status: text("status").$type<"invited" | "active" | "withdrawn" | "completed">().notNull().default("active"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("enrollments_uq").on(t.courseSectionId, t.studentUserId),
    index("enrollments_student_idx").on(t.studentUserId, t.status),
  ],
);

export const classSessions = pgTable(
  "class_sessions",
  {
    id: id(),
    courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
    sequenceNo: integer("sequence_no").notNull(),
    plannedDate: date("planned_date").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<"planned" | "open" | "closed" | "cancelled">().notNull().default("planned"),
    plannedTopicNodeIds: jsonb("planned_topic_node_ids").$type<string[]>().notNull().default([]),
    actualTopicNodeIds: jsonb("actual_topic_node_ids").$type<string[]>().notNull().default([]),
    actualSummary: text("actual_summary"),
    closedAt: ts("closed_at"),
  },
  (t) => [uniqueIndex("class_sessions_uq").on(t.courseSectionId, t.sequenceNo)],
);

export const milestones = pgTable("milestones", {
  id: id(),
  courseSectionId: uuid("course_section_id").notNull().references(() => courseSections.id),
  type: text("type").$type<"exam" | "assignment" | "project" | "other">().notNull(),
  title: text("title").notNull(),
  dueAt: ts("due_at").notNull(),
});
