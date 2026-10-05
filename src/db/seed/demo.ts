import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import {
  aiConversations,
  aiMessages,
  capabilities,
  capabilityPrerequisites,
  classFeedbackSummaries,
  classSessions,
  courseSections,
  courseSectionTeachers,
  curriculumNodes,
  curriculumVersions,
  enrollments,
  experienceDefinitions,
  experienceSessions,
  experienceSpecs,
  institutionMemberships,
  institutions,
  launches,
  milestones,
  profileVersions,
  rawInteractions,
  sourceArtifacts,
  studentProfiles,
  subjects,
  users,
} from "@/db/schema";
import type { KnownErrorType } from "@/db/schema/curriculum";
import type { CognitiveLevel } from "@/modules/shared/enums";
import { CLASS_TITLES, DEMO_CURRICULUM, DEMO_SUBJECT } from "@/modules/curriculum/demo-curriculum";
import { scenarioById } from "@/modules/experience/bank";
import { bankToInput, contentHash } from "@/modules/experience/planner";
import type { DecisionScenarioDefinition } from "@/modules/experience/contract";
import { createSession, ingestEventBatch } from "@/modules/experience/service";
import { recordDecisionEvidence, recordSemanticEvidence } from "@/modules/evidence/service";
import { classifySemantic } from "@/modules/evidence/engine";
import { rubricEvaluate } from "@/modules/ai-gateway/fallbacks/rubric";
import { recomputeInterpretations } from "@/modules/interpretation/service";
import { regenerateRecommendations } from "@/modules/recommendation/service";
import { refreshProjection } from "@/modules/teacher-projection/service";

/**
 * Escenario demo reproducible (DM §28). La evidencia histórica NO se escribe como estados:
 * se generan sesiones, eventos de runtime y conversaciones, y los motores calculan los estados.
 * Un test fija que el resultado sea 12/27 = 44% en "Product Owner vs. Scrum Master".
 */

export const DEMO_DOMAIN = "demo.educai.local";
export const DEMO_TEACHER_EMAIL = `ana.torres@${DEMO_DOMAIN}`;
export const DEMO_STUDENT_EMAIL = `lucia.fernandez@${DEMO_DOMAIN}`;
export const DEMO_STUDENT2_EMAIL = `nicolas.herrera@${DEMO_DOMAIN}`;
export const DEMO_SECTION_CODE = "IPDP26";

const STUDENT_NAMES = [
  "Lucía Fernández", "Nicolás Herrera", "Valentina Ruiz", "Mateo López", "Camila Sosa", "Joaquín Díaz",
  "Martina Acosta", "Benjamín Rojas", "Agustina Medina", "Facundo Molina", "Florencia Castro", "Santiago Ortiz",
  "Julieta Silva", "Tomás Ríos", "Micaela Romero", "Lautaro Benítez", "Rocío Suárez", "Franco Peralta",
  "Milagros Vega", "Bruno Cabrera", "Paula Morales", "Ignacio Navarro", "Abril Quiroga", "Thiago Ferreyra",
  "Carolina Luna", "Gonzalo Aguirre", "Lourdes Giménez", "Emiliano Sánchez", "Victoria Correa", "Federico Pereyra",
  "Antonella Godoy", "Nahuel Ibarra", "Pilar Domínguez", "Ezequiel Farías", "Catalina Ledesma", "Renata Villalba",
];

const emailFor = (name: string) =>
  `${name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, ".")}@${DEMO_DOMAIN}`;

const INTERESTS = ["Tecnología y software", "Emprendimiento", "Operaciones y logística", "Marketing", "Finanzas", "Diseño", "Impacto social"];
const EXPOSURE = ["Producto", "Gestión de proyectos", "Datos", "Ventas", "Operaciones"];

/** Fechas relativas a "hoy" (zona Córdoba): la clase 4 es hoy a las 19 h. */
function classDate(classNo: number, today: Date, hour = 19) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + (classNo - 4) * 7);
  d.setUTCHours(hour + 3, 0, 0, 0); // 19 h ART = 22 h UTC
  return d;
}
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ── Guiones de comportamiento por capacidad (índices de estudiante) ─────────
const ATTENDED_CLASS3 = range(0, 26); // 27 estudiantes
const TUTOR_USERS = range(0, 31);
const R_SM = [0, ...range(2, 9)]; // 9: confunden SM con priorización
const R_PO = [10, 11, 12]; // 3: le asignan impedimentos al PO
const DEV_ROLES = [23, 24, 25, 26];
const ART_REVIEW = [2, 4, 6, 8, 10, 14, 16, 18];
const ART_DEV = [20, 22, 24];
const ART_ASSISTED = [25, 26];
const SPRINT_DEV = [23, 24, 26];
const PLAN_STUDENTS = [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
const PLAN_REVIEW = [3, 7, 21, 29];
const PLAN_DEV = [11, 25, 33];
const RETRO_STUDENTS = [1, 4, 6, 12, 14, 20, 28, 30];
const RETRO_DEV = [20, 28];
const WHO_STUDENTS = [1, 13, 15];

type Choice = { optionId: string; hints?: number };

function roleChoice(i: number, scenarioId: string): Choice {
  const sm = R_SM.includes(i);
  const po = R_PO.includes(i);
  const dev = DEV_ROLES.includes(i);
  switch (scenarioId) {
    case "posm-01":
      return { optionId: sm ? "b" : "a" };
    case "posm-02":
      return { optionId: po ? "b" : dev ? "c" : "a" };
    case "posm-06":
      return { optionId: sm ? "c" : "a" };
    case "posm-08":
      return { optionId: po || dev ? "b" : "a" };
    default:
      return { optionId: "a" };
  }
}

function artChoice(i: number, scenarioId: string): Choice {
  const hints = ART_ASSISTED.includes(i) ? 2 : 0;
  if (ART_REVIEW.includes(i)) return { optionId: scenarioId === "art-02" ? "a" : "b" };
  if (ART_DEV.includes(i)) return { optionId: scenarioId === "art-01" ? "a" : "b" };
  return { optionId: "a", hints };
}

const GOOD_EXPLANATIONS = [
  "El Product Owner es quien decide qué tiene más valor para el producto y ordena el Product Backlog. El Scrum Master no decide el producto: facilita los eventos, ayuda al equipo a trabajar con Scrum y se ocupa de remover impedimentos.",
  "La PO prioriza el backlog pensando en el valor para los usuarios y define qué se hace. El SM es más como un facilitador: ayuda al equipo, cuida el proceso y saca los obstáculos que frenan el trabajo.",
  "Product Owner: maximiza el valor del producto, ordena el Product Backlog y decide prioridades. Scrum Master: acompaña al equipo, facilita las reuniones de Scrum y remueve impedimentos para que el equipo pueda avanzar.",
  "El PO responde por el producto: ordena el backlog y decide qué se construye primero. El Scrum Master ayuda al equipo a aplicar Scrum, facilita los eventos y elimina impedimentos; no le dice al equipo qué hacer.",
];
const PO_MISCONCEPTION =
  "El Product Owner decide el backlog del producto y también ayuda a resolver los impedimentos del equipo cuando algo los frena. El Scrum Master organiza las reuniones de Scrum.";

export async function runDemoSeed(db: DB, now = new Date()) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  // ── Identidad e institución ───────────────────────────────────────────────
  const [inst] = await db.insert(institutions).values({ name: "Universidad Alpha", slug: "alpha" }).returning();
  const [teacher] = await db.insert(users).values({ email: DEMO_TEACHER_EMAIL, displayName: "Ana Torres" }).returning();
  const [teacher2] = await db.insert(users).values({ email: `diego.paz@${DEMO_DOMAIN}`, displayName: "Diego Paz" }).returning();
  await db.insert(institutionMemberships).values([
    { institutionId: inst.id, userId: teacher.id, role: "teacher" },
    { institutionId: inst.id, userId: teacher2.id, role: "teacher" },
  ]);
  const students = await db
    .insert(users)
    .values(STUDENT_NAMES.map((n) => ({ email: emailFor(n), displayName: n })))
    .returning();
  const sid = (i: number) => students[i].id;

  // ── Perfil global (no es evidencia académica) ────────────────────────────
  await db.insert(studentProfiles).values(students.map((s) => ({ studentUserId: s.id, onboardingStatus: "completed" as const })));
  await db.insert(profileVersions).values(
    students.map((s, i) => ({
      studentUserId: s.id,
      versionNo: 1,
      sourceType: "onboarding" as const,
      createdAt: addMin(today, -60 * 24 * 40),
      profilePayload: {
        career: i % 3 === 0 ? "Lic. en Administración" : i % 3 === 1 ? "Ing. Industrial" : "Lic. en Sistemas",
        stage: "3° año",
        works: i % 9 < 5,
        interests: [INTERESTS[i % 4], INTERESTS[(i * 3 + 1) % INTERESTS.length]].filter((v, k, a) => a.indexOf(v) === k),
        exposureAreas: [EXPOSURE[i % EXPOSURE.length]],
        archetypes: i === 0 ? ["Integradora", "Estratega"] : undefined,
        professionalHypothesis: i === 0 ? "Hoy aparecen señales de interés por coordinar equipos y priorizar problemas de producto." : undefined,
        openQuestions: i === 0 ? ["¿Te interesa más decidir qué construir o cómo trabaja el equipo?"] : undefined,
      },
    })),
  );

  // ── Materia y cátedra demo ───────────────────────────────────────────────
  const [subject] = await db.insert(subjects).values({ institutionId: inst.id, ...DEMO_SUBJECT }).returning();
  const [section] = await db
    .insert(courseSections)
    .values({
      subjectId: subject.id,
      institutionId: inst.id,
      name: "Comisión A",
      term: "2° cuatrimestre 2026",
      status: "active",
      joinCode: DEMO_SECTION_CODE,
      startsOn: classDate(1, today).toISOString().slice(0, 10),
      endsOn: classDate(11, today).toISOString().slice(0, 10),
      classroomContext: { approxStudents: 36, classMinutes: 120, devices: ["celulares", "proyector"], groupWork: true },
    })
    .returning();
  await db.insert(courseSectionTeachers).values({ courseSectionId: section.id, teacherUserId: teacher.id, role: "owner" });
  await db.insert(enrollments).values(students.map((s, i) => ({ courseSectionId: section.id, studentUserId: s.id, joinedAt: addMin(classDate(1, today), -60 - i) })));
  await db.insert(milestones).values({ courseSectionId: section.id, type: "exam", title: "1° Parcial", dueAt: addMin(today, 60 * 24 * 9 + 60 * 22) });

  // ── Currícula activa ─────────────────────────────────────────────────────
  const capByKey = await seedCurriculum(db, section.id, now);
  const classIds: string[] = [];
  for (let k = 1; k <= 11; k++) {
    const [cs] = await db
      .insert(classSessions)
      .values({
        courseSectionId: section.id,
        sequenceNo: k,
        plannedDate: classDate(k, today).toISOString().slice(0, 10),
        title: CLASS_TITLES[k - 1],
        status: k < 4 ? "closed" : k === 4 ? "open" : "planned",
        closedAt: k < 4 ? addMin(classDate(k, today), 130) : null,
        actualSummary: k < 4 ? "Clase dictada según lo planificado." : null,
      })
      .returning();
    classIds.push(cs.id);
  }
  await db.insert(classFeedbackSummaries).values({
    courseSectionId: section.id,
    classSessionId: classIds[2],
    respondentCount: 24,
    worked: "El caso de la startup de entregas ayudó a ubicar cada rol en una situación concreta.",
    mainOpportunity: "Varios pidieron más casos para distinguir Product Owner y Scrum Master antes del parcial.",
    otherPatterns: ["La explicación de artefactos se sintió rápida.", "Pidieron tener el material antes de la clase."],
    tryNext: "Abrir la próxima clase con una situación para decidir en lugar de repasar definiciones.",
  });

  // ── Evidencia histórica, siempre a través del pipeline ───────────────────
  // Clase 1 y 2: trabajos prácticos con criterios (structured_activity).
  await seedStructuredActivity(db, {
    sectionId: section.id,
    title: "Trabajo práctico 1 · Mapa AS-IS de una cafetería",
    cap: capByKey["CAP-PROC-01"],
    students: range(0, 32).map((i) => ({ id: sid(i), results: [true, ![23, 24, 30].includes(i)] })),
    at: addMin(classDate(1, today), 60 * 24 * 2),
    criteria: ["Identifica actores y pasos del proceso actual", "Distingue el proceso actual del deseado"],
  });
  await seedStructuredActivity(db, {
    sectionId: section.id,
    title: "Trabajo práctico 2 · Cuellos de botella",
    cap: capByKey["CAP-PROC-02"],
    students: range(0, 31).map((i) => ({ id: sid(i), results: [true, ![22, 31].includes(i)] })),
    at: addMin(classDate(2, today), 60 * 24 * 2),
    criteria: ["Ubica el paso que limita el ritmo del proceso", "Justifica el cuello de botella con datos del mapa"],
  });

  // Clase 3: diagnóstico y cierre de clase con escenarios instrumentados.
  const diag = await seedLaunch(db, {
    sectionId: section.id,
    teacherId: teacher.id,
    title: "Diagnóstico · Roles y artefactos Scrum",
    items: [
      ["CAP-SPRINT-01", "sprint-01"],
      ["CAP-SCRUM-01", "po-01"],
      ["CAP-SCRUM-02", "sm-01"],
      ["CAP-SCRUM-03", "posm-01"],
      ["CAP-SCRUM-03", "posm-02"],
      ["CAP-ART-01", "art-01"],
      ["CAP-ART-01", "art-02"],
    ],
    capByKey,
    at: addMin(classDate(3, today), 10),
  });
  const exit = await seedLaunch(db, {
    sectionId: section.id,
    teacherId: teacher.id,
    title: "Cierre de clase 3 · Caso Rutas Verdes",
    items: [
      ["CAP-SCRUM-03", "posm-06"],
      ["CAP-SCRUM-03", "posm-08"],
      ["CAP-ART-01", "art-03"],
      ["CAP-SPRINT-01", "sprint-02"],
    ],
    capByKey,
    at: addMin(classDate(3, today), 100),
  });
  for (const i of ATTENDED_CLASS3) {
    await runScriptedSession(db, sid(i), diag, addMin(classDate(3, today), 12 + i % 7), (scn) => {
      if (scn.startsWith("posm")) return roleChoice(i, scn);
      if (scn.startsWith("art")) return artChoice(i, scn);
      return { optionId: "a" };
    });
    await runScriptedSession(db, sid(i), exit, addMin(classDate(3, today), 102 + i % 9), (scn) => {
      if (scn.startsWith("posm")) return roleChoice(i, scn);
      if (scn.startsWith("art")) return artChoice(i, scn);
      if (scn === "sprint-02") return { optionId: SPRINT_DEV.includes(i) ? "b" : "a" };
      return { optionId: "a" };
    });
  }

  // Entre clases: explicaciones en el tutor de Educai (evidencia semántica, MEDIUM).
  for (const i of TUTOR_USERS) {
    const text = R_PO.includes(i) ? PO_MISCONCEPTION : GOOD_EXPLANATIONS[i % GOOD_EXPLANATIONS.length];
    await seedTutorExplanation(db, {
      sectionId: section.id,
      studentId: sid(i),
      caps: [capByKey["CAP-SCRUM-01"], capByKey["CAP-SCRUM-02"], capByKey["CAP-SCRUM-03"]],
      answer: text,
      at: addMin(today, -60 * 24 * 3 + i * 7 - 60 * 5),
    });
  }

  // Clase 4 (hoy, antes de clase): prácticas previas de eventos y responsabilidades.
  const plan = await seedLaunch(db, {
    sectionId: section.id,
    teacherId: teacher.id,
    title: "Práctica previa · Sprint Planning",
    items: [["CAP-EV-01", "plan-01"], ["CAP-EV-01", "plan-02"]],
    capByKey,
    at: addMin(classDate(4, today), -60 * 10),
  });
  for (const i of PLAN_STUDENTS)
    await runScriptedSession(db, sid(i), plan, addMin(classDate(4, today), -60 * 9 + i), (scn) => ({
      optionId: PLAN_REVIEW.includes(i) ? "b" : PLAN_DEV.includes(i) && scn === "plan-02" ? "c" : "a",
    }));
  const retro = await seedLaunch(db, {
    sectionId: section.id,
    teacherId: teacher.id,
    title: "Práctica previa · Retrospectiva",
    items: [["CAP-EV-02", "retro-01"], ["CAP-EV-02", "retro-02"]],
    capByKey,
    at: addMin(classDate(4, today), -60 * 8),
  });
  for (const i of RETRO_STUDENTS)
    await runScriptedSession(db, sid(i), retro, addMin(classDate(4, today), -60 * 7 + i), (scn) => ({ optionId: RETRO_DEV.includes(i) && scn === "retro-02" ? "b" : "a" }));
  const who = await seedLaunch(db, {
    sectionId: section.id,
    teacherId: teacher.id,
    title: "Práctica previa · ¿Quién hace qué?",
    items: [["CAP-SCRUM-04", "who-01"], ["CAP-SCRUM-04", "who-02"]],
    capByKey,
    at: addMin(classDate(4, today), -60 * 6),
  });
  for (const i of WHO_STUDENTS) await runScriptedSession(db, sid(i), who, addMin(classDate(4, today), -60 * 5 + i), () => ({ optionId: "a" }));

  // ── Segunda cátedra (aislada) para Lucía ─────────────────────────────────
  const stats = await seedStatsSection(db, { inst: inst.id, teacher: teacher2.id, studentIds: [sid(0), ...range(20, 26).map(sid)], today, now });

  // ── Interpretación, recomendaciones y proyección docente ─────────────────
  for (const s of students) {
    await recomputeInterpretations(db, s.id, section.id, { trigger: "seed", now });
    await regenerateRecommendations(db, s.id, section.id, { subjectName: subject.name, now });
  }
  for (const id of stats.studentIds) {
    await recomputeInterpretations(db, id, stats.sectionId, { trigger: "seed", now });
    await regenerateRecommendations(db, id, stats.sectionId, { subjectName: "Estadística Aplicada", now });
  }
  await refreshProjection(db, section.id, { label: "seed", now });
  await refreshProjection(db, stats.sectionId, { label: "seed", now });
  return { sectionId: section.id, teacherId: teacher.id, studentId: sid(0) };
}

async function seedCurriculum(db: DB, sectionId: string, now: Date, curriculum = DEMO_CURRICULUM) {
  const [version] = await db
    .insert(curriculumVersions)
    .values({ courseSectionId: sectionId, versionNo: 1, status: "active", source: "seed", activatedAt: now })
    .returning();
  const capByKey: Record<string, typeof capabilities.$inferSelect> = {};
  let capOrder = 0;
  for (const [mi, m] of curriculum.entries()) {
    const [mod] = await db
      .insert(curriculumNodes)
      .values({ curriculumVersionId: version.id, courseSectionId: sectionId, nodeType: "module", title: m.title, sortOrder: mi })
      .returning();
    for (const [ui, u] of m.units.entries()) {
      const [unit] = await db
        .insert(curriculumNodes)
        .values({ curriculumVersionId: version.id, courseSectionId: sectionId, parentId: mod.id, nodeType: "unit", title: u.title, description: u.description, sortOrder: ui, plannedClassNo: u.plannedClassNo })
        .returning();
      for (const [ti, t] of u.topics.entries()) {
        const [topic] = await db
          .insert(curriculumNodes)
          .values({ curriculumVersionId: version.id, courseSectionId: sectionId, parentId: unit.id, nodeType: "topic", title: t.title, sortOrder: ti, plannedClassNo: t.plannedClassNo })
          .returning();
        for (const c of t.capabilities) {
          const [cap] = await db
            .insert(capabilities)
            .values({
              curriculumVersionId: version.id,
              courseSectionId: sectionId,
              nodeId: topic.id,
              stableKey: c.key,
              statement: c.statement,
              shortLabel: c.shortLabel,
              studentExplanation: c.studentExplanation,
              actionVerb: c.actionVerb,
              targetCognitiveLevel: c.level,
              importance: c.importance,
              sortOrder: capOrder++,
              plannedClassNo: c.plannedClassNo,
              knownErrorTypes: c.errors ?? [],
              keywords: c.keywords,
            })
            .returning();
          capByKey[c.key] = cap;
        }
      }
    }
  }
  for (const m of curriculum)
    for (const u of m.units)
      for (const t of u.topics)
        for (const c of t.capabilities)
          for (const p of c.prerequisites ?? [])
            if (capByKey[p]) await db.insert(capabilityPrerequisites).values({ capabilityId: capByKey[c.key].id, prerequisiteCapabilityId: capByKey[p].id, criticality: "high" });
  return capByKey;
}

type SeedLaunch = { def: typeof experienceDefinitions.$inferSelect; launchId: string };

async function seedLaunch(
  db: DB,
  args: {
    sectionId: string;
    teacherId: string;
    title: string;
    items: [string, string][];
    capByKey: Record<string, typeof capabilities.$inferSelect>;
    at: Date;
  },
): Promise<SeedLaunch> {
  const steps = args.items.map(([capKey, scenarioId], i) => {
    const s = bankToInput(scenarioById(scenarioId)!);
    return {
      id: `s${i + 1}`,
      opportunityId: `opp_${i + 1}`,
      capabilityId: args.capByKey[capKey].id,
      cognitiveDemand: s.level,
      scenarioFamily: s.family,
      scenarioKey: s.scenarioKey,
      independenceGroup: `g${i + 1}`,
      situation: s.situation,
      question: s.question,
      options: s.options.map((o, j) => ({ id: String.fromCharCode(97 + j), text: o.text, correct: o.correct, errorKey: o.correct ? null : (o.errorKey ?? null), feedback: o.feedback })),
      hints: s.hints,
      takeaway: s.takeaway,
    };
  });
  const capIds = [...new Set(steps.map((s) => s.capabilityId))];
  const def: DecisionScenarioDefinition = {
    schemaVersion: "1.0",
    format: "decision_scenario",
    title: args.title,
    description: "Actividad breve con situaciones de decisión.",
    learningObjective: "Aplicar los conceptos de la unidad en situaciones concretas.",
    estimatedMinutes: Math.max(4, steps.length * 2),
    targetCapabilityIds: capIds,
    targetCognitiveLevel: "apply",
    context: { organization: "Rutas Verdes", intro: "Situaciones del equipo de producto de Rutas Verdes." },
    steps,
    feedbackPolicy: { type: "immediate" },
    assistancePolicy: { maxHintsPerStep: 2, revealAllowed: false },
    evidenceContract: {
      targetCapabilityIds: capIds,
      requiredCognitiveLevel: "apply",
      requiredOpportunityCount: 1,
      minimumUnassistedOpportunities: 1,
      acceptedPerformanceTypes: ["decision"],
      assistanceConstraints: { maxLevelForStateEligibility: "light_prompting" },
      expectedErrorTaxonomy: [],
    },
    completionRule: { type: "all_required_steps", minimumOpportunitiesAttempted: steps.length },
  };
  const [spec] = await db
    .insert(experienceSpecs)
    .values({
      courseSectionId: args.sectionId,
      objective: def.learningObjective,
      targetCapabilityIds: capIds,
      targetCognitiveLevel: "apply",
      pedagogicalPattern: "diagnostic_probe",
      plannerVersion: "seed",
      createdByUserId: args.teacherId,
      createdAt: args.at,
    })
    .returning();
  const [d] = await db
    .insert(experienceDefinitions)
    .values({
      experienceSpecId: spec.id,
      courseSectionId: args.sectionId,
      experienceKey: `seed-${spec.id.slice(0, 8)}`,
      version: "1.0.0",
      title: args.title,
      audience: "class_launch",
      generationSource: "seed",
      definition: def,
      qualityReview: { overall: "pass", checks: [{ dimension: "contrato", result: "pass", message: "Actividad de cátedra precargada." }] },
      contentHash: contentHash(def),
      status: "published",
      publishedAt: args.at,
      createdAt: args.at,
    })
    .returning();
  const [l] = await db
    .insert(launches)
    .values({
      experienceDefinitionId: d.id,
      courseSectionId: args.sectionId,
      status: "closed",
      joinCode: `S${spec.id.slice(0, 5).toUpperCase()}`,
      opensAt: args.at,
      closesAt: addMin(args.at, 20),
      createdByUserId: args.teacherId,
      createdAt: args.at,
    })
    .returning();
  return { def: d, launchId: l.id };
}

/** Sesión guionada: usa el mismo runtime (eventos SDK → evidencia) que un estudiante real. */
async function runScriptedSession(db: DB, studentId: string, l: SeedLaunch, at: Date, choose: (scenarioKey: string) => Choice) {
  const session = await createSession(db, { studentId, def: l.def, launchId: l.launchId, now: at });
  const events: { event_id: string; sequence_no: number; event_type: string; step_id?: string; opportunity_id?: string; occurred_at: string; schema_version: "1.0"; payload: Record<string, unknown> }[] = [];
  let seq = 0;
  let t = at;
  events.push({ event_id: `${session.id}-start`, sequence_no: seq++, event_type: "experience_started", occurred_at: t.toISOString(), schema_version: "1.0", payload: {} });
  for (const step of l.def.definition.steps) {
    const c = choose(step.scenarioKey);
    t = addMin(t, 1);
    for (let h = 0; h < (c.hints ?? 0); h++)
      events.push({ event_id: `${session.id}-${step.id}-h${h}`, sequence_no: seq++, event_type: "hint_requested", step_id: step.id, opportunity_id: step.opportunityId, occurred_at: t.toISOString(), schema_version: "1.0", payload: {} });
    events.push({ event_id: `${session.id}-${step.id}-d`, sequence_no: seq++, event_type: "decision_made", step_id: step.id, opportunity_id: step.opportunityId, occurred_at: addMin(t, 1).toISOString(), schema_version: "1.0", payload: { option_id: c.optionId } });
  }
  await ingestEventBatch(db, studentId, { session_id: session.id, batch_id: `seed-${session.id}`, sdk_version: "1.0.0", events }, { now: t });
  await db.update(experienceSessions).set({ status: "completed", completedAt: addMin(t, 2), lastActivityAt: addMin(t, 2) }).where(eq(experienceSessions.id, session.id));
  await db.update(sourceArtifacts).set({ processingStatus: "ready" }).where(eq(sourceArtifacts.id, session.sourceArtifactId!));
}

async function seedStructuredActivity(
  db: DB,
  args: { sectionId: string; title: string; cap: typeof capabilities.$inferSelect; students: { id: string; results: boolean[] }[]; at: Date; criteria: string[] },
) {
  for (const [n, st] of args.students.entries()) {
    const at = addMin(args.at, n * 3);
    const [src] = await db
      .insert(sourceArtifacts)
      .values({ studentUserId: st.id, courseSectionId: args.sectionId, sourceType: "structured_activity", title: args.title, provenanceQuality: "direct", processingStatus: "ready", sourceCreatedAt: at, createdAt: at })
      .returning();
    for (const [k, ok] of st.results.entries()) {
      const [raw] = await db
        .insert(rawInteractions)
        .values({ sourceArtifactId: src.id, studentUserId: st.id, courseSectionId: args.sectionId, actor: "student", interactionType: "criterion_check", contentText: args.criteria[k], payload: { met: ok }, sequenceNo: k, occurredAt: at })
        .returning();
      await recordDecisionEvidence(db, {
        studentId: st.id,
        sectionId: args.sectionId,
        sourceArtifactId: src.id,
        sourceType: "structured_activity",
        rawInteractionId: raw.id,
        sessionId: src.id,
        stepId: `c${k + 1}`,
        scenarioKey: `${args.cap.stableKey}-tp-c${k + 1}`,
        capabilityId: args.cap.id,
        cognitiveDemand: args.cap.targetCognitiveLevel,
        optionId: ok ? "met" : "not_met",
        optionText: args.criteria[k],
        correct: ok,
        errorKey: null,
        errorLabel: null,
        hintsUsed: 0,
        answerRevealed: false,
        occurredAt: at,
        situation: args.title,
        question: args.criteria[k],
        rationaleOverride: ok ? `Cumplió el criterio: ${args.criteria[k].toLowerCase()}.` : `Todavía no cumple el criterio: ${args.criteria[k].toLowerCase()}.`,
      });
    }
  }
}

async function seedTutorExplanation(
  db: DB,
  args: { sectionId: string; studentId: string; caps: (typeof capabilities.$inferSelect)[]; answer: string; at: Date },
) {
  const question = "Explicá con tus palabras qué hace el Product Owner, qué hace el Scrum Master y en qué se diferencian.";
  const [src] = await db
    .insert(sourceArtifacts)
    .values({ studentUserId: args.studentId, courseSectionId: args.sectionId, sourceType: "educai_ai_chat", title: "Tutor · Roles de Scrum", provenanceQuality: "direct", processingStatus: "ready", sourceCreatedAt: args.at, createdAt: args.at })
    .returning();
  const [conv] = await db.insert(aiConversations).values({ sourceArtifactId: src.id, studentUserId: args.studentId, courseSectionId: args.sectionId, capabilityId: args.caps[2].id, status: "closed", createdAt: args.at }).returning();
  await db.insert(aiMessages).values([
    { conversationId: conv.id, sequenceNo: 1, actor: "assistant", mode: "evidence", content: `Ahora probalo por tu cuenta. ${question}`, createdAt: args.at, promptVersion: "seed" },
    { conversationId: conv.id, sequenceNo: 2, actor: "student", mode: "evidence", content: args.answer, createdAt: addMin(args.at, 2) },
  ]);
  const [raw] = await db
    .insert(rawInteractions)
    .values({ sourceArtifactId: src.id, studentUserId: args.studentId, courseSectionId: args.sectionId, actor: "student", interactionType: "explanation", contentText: args.answer, sequenceNo: 2, occurredAt: addMin(args.at, 2) })
    .returning();
  for (const cap of args.caps) {
    const evaluation = rubricEvaluate(cap, args.answer, "explain");
    const classification = classifySemantic({
      performance: evaluation.performance,
      errorKey: evaluation.errorKey,
      demonstratedLevel: "explain",
      mappingConfidence: evaluation.mappingConfidence,
      assistance: "none",
      provenance: "direct",
      rationale: evaluation.rationale,
    });
    await recordSemanticEvidence(db, {
      studentId: args.studentId,
      sectionId: args.sectionId,
      sourceArtifactId: src.id,
      sourceType: "educai_ai_chat",
      rawInteractionIds: [raw.id],
      capabilityId: cap.id,
      eventType: "explanation",
      taskDemand: "explain",
      classification,
      mappingConfidence: evaluation.mappingConfidence,
      assistance: "none",
      provenance: "direct",
      familyKey: `explain:${cap.stableKey}`,
      dedupeKey: `chat:${src.id}:${cap.id}`,
      occurredAt: addMin(args.at, 2),
      excerpt: evaluation.paraphrase,
      taskContext: { question },
    });
  }
}

async function seedStatsSection(db: DB, args: { inst: string; teacher: string; studentIds: string[]; today: Date; now: Date }) {
  const [subject] = await db.insert(subjects).values({ institutionId: args.inst, name: "Estadística Aplicada", code: "EST", description: "Herramientas estadísticas para decidir con datos." }).returning();
  const [section] = await db
    .insert(courseSections)
    .values({ subjectId: subject.id, institutionId: args.inst, name: "Comisión B", term: "2° cuatrimestre 2026", status: "active", joinCode: "ESTA26", classroomContext: { approxStudents: 40 } })
    .returning();
  await db.insert(courseSectionTeachers).values({ courseSectionId: section.id, teacherUserId: args.teacher });
  await db.insert(enrollments).values(args.studentIds.map((id) => ({ courseSectionId: section.id, studentUserId: id })));
  for (let k = 1; k <= 10; k++)
    await db.insert(classSessions).values({ courseSectionId: section.id, sequenceNo: k, plannedDate: classDate(k, args.today, 9).toISOString().slice(0, 10), title: `Clase ${k}`, status: k < 4 ? "closed" : k === 4 ? "open" : "planned" });
  const errors: KnownErrorType[] = [{ key: "mean_always", label: "Usa la media aunque haya valores extremos", description: "No considera el efecto de los valores atípicos." }];
  const capByKey = await seedCurriculum(
    db,
    section.id,
    args.now,
    [
      {
        key: "EM1",
        title: "Estadística descriptiva",
        units: [
          {
            key: "EU1",
            title: "Unidad 1 · Medidas de resumen",
            description: "Resumir datos para decidir.",
            plannedClassNo: 1,
            topics: [
              {
                key: "ET1",
                title: "Tendencia central",
                plannedClassNo: 2,
                capabilities: [
                  { key: "CAP-EST-01", statement: "Interpretar la media y la mediana de un conjunto de datos", shortLabel: "Media y mediana", studentExplanation: "Saber qué dice cada medida sobre los datos.", actionVerb: "Interpretar", level: "explain" as CognitiveLevel, importance: "high", plannedClassNo: 2, keywords: ["media", "mediana", "promedio"] },
                  { key: "CAP-EST-02", statement: "Elegir la medida de tendencia central adecuada según los datos", shortLabel: "Elegir media o mediana", studentExplanation: "Decidir qué medida usar cuando hay valores extremos.", actionVerb: "Elegir", level: "apply" as CognitiveLevel, importance: "high", plannedClassNo: 3, prerequisites: ["CAP-EST-01"], errors, keywords: ["media", "mediana", "atípico"] },
                ],
              },
            ],
          },
          {
            key: "EU2",
            title: "Unidad 2 · Inferencia",
            description: "Estimar con incertidumbre.",
            plannedClassNo: 6,
            topics: [
              { key: "ET2", title: "Intervalos de confianza", plannedClassNo: 6, capabilities: [{ key: "CAP-EST-03", statement: "Interpretar un intervalo de confianza", shortLabel: "Intervalos de confianza", studentExplanation: "Leer qué dice y qué no dice un intervalo.", actionVerb: "Interpretar", level: "explain" as CognitiveLevel, importance: "medium", plannedClassNo: 6, keywords: ["intervalo", "confianza"] }] },
            ],
          },
        ],
      },
    ],
  );
  await seedStructuredActivity(db, {
    sectionId: section.id,
    title: "Guía 1 · Medidas de resumen",
    cap: capByKey["CAP-EST-01"],
    students: args.studentIds.map((id) => ({ id, results: [true, true] })),
    at: classDate(2, args.today, 9),
    criteria: ["Interpreta correctamente la media", "Interpreta correctamente la mediana"],
  });
  await seedStructuredActivity(db, {
    sectionId: section.id,
    title: "Guía 2 · ¿Media o mediana?",
    cap: capByKey["CAP-EST-02"],
    students: args.studentIds.map((id, n) => ({ id, results: n === 0 ? [true] : [true, n % 2 === 0] })),
    at: classDate(3, args.today, 9),
    criteria: ["Elige la mediana ante salarios con valores extremos", "Justifica la elección con la forma de la distribución"],
  });
  return { sectionId: section.id, studentIds: args.studentIds };
}

export async function demoUserIds(db: DB) {
  const [t] = await db.select().from(users).where(eq(users.email, DEMO_TEACHER_EMAIL)).limit(1);
  const [s] = await db.select().from(users).where(eq(users.email, DEMO_STUDENT_EMAIL)).limit(1);
  const [s2] = await db.select().from(users).where(eq(users.email, DEMO_STUDENT2_EMAIL)).limit(1);
  const [sec] = await db.select().from(courseSections).where(and(eq(courseSections.joinCode, DEMO_SECTION_CODE))).limit(1);
  return { teacherId: t?.id, studentId: s?.id, student2Id: s2?.id, sectionId: sec?.id };
}
