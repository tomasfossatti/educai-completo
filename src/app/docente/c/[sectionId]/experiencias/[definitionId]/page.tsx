import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { getDefinitionForTeacher } from "@/modules/experience/service";
import { getCurriculum } from "@/modules/curriculum/service";
import { DomainError } from "@/modules/shared/errors";
import { ExperiencePreview } from "./preview";

export const metadata = { title: "Vista previa de experiencia" };

export default async function ExperiencePreviewPage({ params }: { params: Promise<{ sectionId: string; definitionId: string }> }) {
  const { sectionId, definitionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  let data;
  try {
    data = await getDefinitionForTeacher(db, user.id, definitionId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  if (data.def.courseSectionId !== sectionId) notFound();
  const { capabilities } = await getCurriculum(db, sectionId);
  const capIds = data.def.definition.targetCapabilityIds;
  const caps = capabilities.filter((c) => capIds.includes(c.id));
  const errorLabels = Object.fromEntries(caps.flatMap((c) => c.knownErrorTypes.map((e) => [e.key, e.label])));
  const open = data.launches.find((l) => l.status === "open");
  return (
    <div className="space-y-5">
      <a href={`/docente/c/${sectionId}/experiencias`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Experiencias de la cátedra
      </a>
      <ExperiencePreview
        sectionId={sectionId}
        definitionId={definitionId}
        findingId={data.spec?.findingId ?? null}
        def={data.def.definition}
        review={data.def.qualityReview}
        status={data.def.status}
        source={data.def.generationSource}
        capabilityLabel={caps.map((c) => c.shortLabel).join(", ")}
        errorLabels={errorLabels}
        openLaunchId={open?.id ?? null}
        nextVariant={(Number.parseInt(definitionId.slice(0, 6), 16) % 5) + 1}
      />
    </div>
  );
}
