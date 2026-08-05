import { notFound } from "next/navigation";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KnowledgeAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const id = Number((await params).id);
  const area = await prisma.knowledgeArea.findFirst({ where: { id, status: "Aktiv" }, include: { children: { where: { status: "Aktiv" }, select: { id: true } }, parent: true } });
  if (!area) notFound(); const areaIds = [area.id, ...area.children.map((child) => child.id)];
  const contents = await prisma.knowledgeContent.findMany({ where: { status: "Aktiv", areas: { some: { knowledgeAreaId: { in: areaIds } } } }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: { title: "asc" } });
  return <div><OrdoCampusHeader active="/ordo-campus/wissensgebiete" title={area.title} description={area.description ?? area.shortDescription}/>{area.parent && <p className="mb-4 text-sm text-[var(--color-text-muted)]">Untergebiet von {area.parent.title}</p>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contents.map((content) => <KnowledgeCard key={content.id} content={content}/>)}</div>{!contents.length && <p className="rounded-lg border border-dashed p-8 text-center text-[var(--color-text-muted)]">Noch keine aktiven Inhalte in diesem Wissensgebiet.</p>}</div>;
}
