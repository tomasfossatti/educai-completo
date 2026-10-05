import { sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { users } from "@/db/schema";
import { runDemoSeed } from "./demo";

const ALL_TABLES = [
  "ai_calls",
  "product_analytics_events",
  "outbox_events",
  "class_feedback_summaries",
  "teacher_finding_validations",
  "teacher_findings",
  "classroom_capability_snapshots",
  "classroom_capability_projection",
  "runtime_events",
  "experience_sessions",
  "launches",
  "experience_definitions",
  "experience_specs",
  "recommendation_history",
  "recommendation_feedback",
  "recommendation_sources",
  "recommendation_capabilities",
  "recommendations",
  "error_patterns",
  "interpretation_history",
  "capability_interpretations",
  "evidence_invalidations",
  "evidence_signals",
  "evidence_events",
  "opportunities",
  "raw_interactions",
  "ai_messages",
  "ai_conversations",
  "source_artifacts",
  "profile_versions",
  "student_profiles",
  "materials",
  "capability_prerequisites",
  "capabilities",
  "curriculum_nodes",
  "curriculum_versions",
  "milestones",
  "class_sessions",
  "enrollments",
  "course_section_teachers",
  "course_sections",
  "subjects",
  "institution_memberships",
  "institutions",
  "users",
];

export async function ensureSeeded(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  if (Number(n) > 0 || process.env.EDUCAI_SEED === "off") return;
  const t = Date.now();
  await runDemoSeed(db);
  console.info(`[educai] escenario demo creado en ${Date.now() - t} ms`);
}

/** Vacía todas las tablas y recrea el escenario demo. Solo con DEMO_MODE habilitado. */
export async function resetDemo(db: DB) {
  await db.execute(sql.raw(`TRUNCATE ${ALL_TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
  await runDemoSeed(db);
}
