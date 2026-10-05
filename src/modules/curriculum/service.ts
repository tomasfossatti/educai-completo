import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { capabilities, capabilityPrerequisites, curriculumNodes, curriculumVersions } from "@/db/schema";

export type CapabilityRecord = typeof capabilities.$inferSelect & {
  prerequisiteIds: string[];
  topicTitle: string;
  unitTitle: string;
  unitId: string | null;
};

export async function getActiveVersion(db: DB, sectionId: string) {
  const [v] = await db
    .select()
    .from(curriculumVersions)
    .where(and(eq(curriculumVersions.courseSectionId, sectionId), eq(curriculumVersions.status, "active")))
    .limit(1);
  return v ?? null;
}

export async function getCurriculum(db: DB, sectionId: string) {
  const version = await getActiveVersion(db, sectionId);
  if (!version) return { version: null, nodes: [], capabilities: [] as CapabilityRecord[] };
  const nodes = await db
    .select()
    .from(curriculumNodes)
    .where(and(eq(curriculumNodes.curriculumVersionId, version.id), eq(curriculumNodes.status, "active")))
    .orderBy(asc(curriculumNodes.sortOrder));
  const caps = await db
    .select()
    .from(capabilities)
    .where(and(eq(capabilities.curriculumVersionId, version.id), eq(capabilities.status, "active")))
    .orderBy(asc(capabilities.sortOrder));
  const capIds = caps.map((c) => c.id);
  const prereqs = capIds.length
    ? await db.select().from(capabilityPrerequisites).where(inArray(capabilityPrerequisites.capabilityId, capIds))
    : [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const records: CapabilityRecord[] = caps.map((c) => {
    const topic = nodeById.get(c.nodeId);
    const unit = topic?.parentId ? nodeById.get(topic.parentId) : undefined;
    return {
      ...c,
      prerequisiteIds: prereqs.filter((p) => p.capabilityId === c.id).map((p) => p.prerequisiteCapabilityId),
      topicTitle: topic?.title ?? "",
      unitTitle: unit?.title ?? "",
      unitId: unit?.id ?? null,
    };
  });
  return { version, nodes, capabilities: records };
}

export async function getCapability(db: DB, sectionId: string, capabilityId: string) {
  const { capabilities: caps } = await getCurriculum(db, sectionId);
  return caps.find((c) => c.id === capabilityId) ?? null;
}
