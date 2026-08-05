import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FirmStandardsPage() {
  const user = await requireUser();
  const contents = await prisma.knowledgeContent.findMany({ where: { status: "Aktiv", contentTypes: { contains: "Kanzleistandard" } }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: [{ areas: { _count: "desc" } }, { title: "asc" }] });
  return <div><OrdoCampusHeader active="/ordo-campus/kanzleistandards" title="Kanzleistandards" description="Verbindliche interne Vorgaben – zentral, aktuell und nach Wissensgebiet auffindbar."/><div className="mb-5 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] p-5"><strong className="text-[var(--color-primary-dark)]">Verbindliche Kanzleivorgaben</strong><p className="mt-1 text-sm">Diese Inhalte beschreiben den aktuell veröffentlichten internen Standard.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contents.map((content) => <KnowledgeCard content={content} key={content.id}/>)}</div></div>;
}
