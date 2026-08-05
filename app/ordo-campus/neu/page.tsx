import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KNOWLEDGE_NEW_DAYS, knowledgeNewSince } from "@/lib/knowledge-platform-catalog";

export default async function NewKnowledgePage() {
  const user = await requireUser(); const since = knowledgeNewSince();
  const contents = await prisma.knowledgeContent.findMany({ where: { status: "Aktiv", OR: [{ publishedAt: { gte: since } }, { majorUpdatedAt: { gte: since } }] }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: [{ majorUpdatedAt: "desc" }, { publishedAt: "desc" }] });
  return <div><OrdoCampusHeader active="/ordo-campus/neu" title="Neu und aktualisiert" description={`In den vergangenen ${KNOWLEDGE_NEW_DAYS} Tagen veröffentlichte oder ausdrücklich wesentlich aktualisierte Inhalte.`}/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contents.map((content) => <KnowledgeCard content={content} key={content.id}/>)}</div>{!contents.length && <p className="rounded-lg border border-dashed p-8 text-center text-[var(--color-text-muted)]">In diesem Zeitraum wurden keine Inhalte veröffentlicht oder wesentlich aktualisiert.</p>}</div>;
}
