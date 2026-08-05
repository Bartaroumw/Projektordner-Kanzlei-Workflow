import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RecentlyViewedPage() {
  const user = await requireUser();
  const entries = await prisma.knowledgeUserProgress.findMany({ where: { userId: user.id, knowledgeContent: { status: "Aktiv" } }, include: { knowledgeContent: { include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } } } }, orderBy: { lastViewedAt: "desc" }, take: 100 });
  return <div><OrdoCampusHeader active="/ordo-campus/zuletzt" title="Zuletzt angesehen" description="Ihre persönliche Leseliste; sie ist für Vorgesetzte nicht als Auswertung sichtbar."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <KnowledgeCard content={entry.knowledgeContent} key={entry.id}/>)}</div>{!entries.length && <p className="rounded-lg border border-dashed p-8 text-center text-[var(--color-text-muted)]">Sie haben noch keinen aktiven Wissensinhalt geöffnet.</p>}</div>;
}
