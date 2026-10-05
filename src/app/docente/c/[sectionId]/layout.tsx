import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/modules/identity/session";
import { assertTeacherOfSection, getSection } from "@/modules/academic/service";
import { DomainError } from "@/modules/shared/errors";
import { TeacherTabs } from "@/ui/teacher-tabs";

export default async function SectionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const user = await requireTeacher();
  const db = await getDb();
  try {
    await assertTeacherOfSection(db, user.id, sectionId);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  const { section, subject } = await getSection(db, sectionId);
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <p className="text-sm text-ink-muted">
            {section.name} · {section.term}
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{subject.name}</h1>
          <div className="mt-2">
            <TeacherTabs sectionId={sectionId} />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">{children}</main>
    </>
  );
}
