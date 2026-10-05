import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  classSessions,
  courseSections,
  courseSectionTeachers,
  enrollments,
  milestones,
  subjects,
} from "@/db/schema";
import { DomainError } from "@/modules/shared/errors";
import type { ScheduleStatus } from "@/modules/recommendation/student-engine";

export async function assertEnrolled(db: DB, studentId: string, sectionId: string) {
  const [e] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentUserId, studentId), eq(enrollments.courseSectionId, sectionId), eq(enrollments.status, "active")))
    .limit(1);
  // 404 y no 403: no revelar existencia de recursos de otras cátedras (API invariante 4).
  if (!e) throw new DomainError("NOT_FOUND", "Cátedra no encontrada");
}

/** ABAC: teacher AND assigned_to(course_section) (TA:757-761). */
export async function assertTeacherOfSection(db: DB, teacherId: string, sectionId: string) {
  const [t] = await db
    .select()
    .from(courseSectionTeachers)
    .where(and(eq(courseSectionTeachers.teacherUserId, teacherId), eq(courseSectionTeachers.courseSectionId, sectionId)))
    .limit(1);
  if (!t) throw new DomainError("NOT_FOUND", "Cátedra no encontrada");
}

export async function getSection(db: DB, sectionId: string) {
  const [row] = await db
    .select({ section: courseSections, subject: subjects })
    .from(courseSections)
    .innerJoin(subjects, eq(subjects.id, courseSections.subjectId))
    .where(eq(courseSections.id, sectionId))
    .limit(1);
  if (!row) throw new DomainError("NOT_FOUND", "Cátedra no encontrada");
  return row;
}

export async function getSchedule(db: DB, sectionId: string) {
  return db.select().from(classSessions).where(eq(classSessions.courseSectionId, sectionId)).orderBy(asc(classSessions.sequenceNo));
}

export function currentClassFrom(schedule: { sequenceNo: number; status: string }[]): number {
  const open = schedule.find((c) => c.status === "open");
  if (open) return open.sequenceNo;
  const closed = schedule.filter((c) => c.status === "closed");
  if (closed.length === 0) return 1;
  return Math.min(Math.max(...closed.map((c) => c.sequenceNo)) + 1, schedule.length || 1);
}

export function scheduleStatusFor(plannedClassNo: number | null | undefined, currentClass: number): ScheduleStatus {
  if (plannedClassNo == null) return "active";
  if (plannedClassNo < currentClass) return "introduced";
  if (plannedClassNo === currentClass) return "active";
  return "not_introduced";
}

export async function getNextMilestone(db: DB, sectionId: string, now = new Date()) {
  const [m] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.courseSectionId, sectionId), gte(milestones.dueAt, now)))
    .orderBy(asc(milestones.dueAt))
    .limit(1);
  return m ?? null;
}

export async function getSectionOverview(db: DB, sectionId: string, now = new Date()) {
  const { section, subject } = await getSection(db, sectionId);
  const schedule = await getSchedule(db, sectionId);
  const currentClass = currentClassFrom(schedule);
  const milestone = await getNextMilestone(db, sectionId, now);
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseSectionId, sectionId), eq(enrollments.status, "active")));
  return {
    section,
    subject,
    schedule,
    currentClass,
    totalClasses: schedule.length,
    currentSession: schedule.find((c) => c.sequenceNo === currentClass) ?? null,
    milestone,
    milestoneInDays: milestone ? Math.ceil((milestone.dueAt.getTime() - now.getTime()) / 86_400_000) : null,
    enrolledCount: enrolled.length,
  };
}

export async function listStudentSections(db: DB, studentId: string) {
  return db
    .select({ section: courseSections, subject: subjects })
    .from(enrollments)
    .innerJoin(courseSections, eq(courseSections.id, enrollments.courseSectionId))
    .innerJoin(subjects, eq(subjects.id, courseSections.subjectId))
    .where(and(eq(enrollments.studentUserId, studentId), eq(enrollments.status, "active")))
    .orderBy(asc(enrollments.joinedAt));
}

export async function listTeacherSections(db: DB, teacherId: string) {
  return db
    .select({ section: courseSections, subject: subjects })
    .from(courseSectionTeachers)
    .innerJoin(courseSections, eq(courseSections.id, courseSectionTeachers.courseSectionId))
    .innerJoin(subjects, eq(subjects.id, courseSections.subjectId))
    .where(eq(courseSectionTeachers.teacherUserId, teacherId))
    .orderBy(asc(courseSections.createdAt));
}

export async function activeEnrollmentIds(db: DB, sectionId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: enrollments.studentUserId })
    .from(enrollments)
    .where(and(eq(enrollments.courseSectionId, sectionId), eq(enrollments.status, "active")));
  return rows.map((r) => r.studentId);
}

export function generateCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
