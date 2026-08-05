import Link from "next/link";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { knowledgeNewSince } from "@/lib/knowledge-platform-catalog";

export default async function OrdoCampusPage() {
  const user = await requireUser();
  const since = knowledgeNewSince();
  const targetRoles = [...user.roles, "ALLE"];
  const [areas, paths, recent, lastViewed, standards] = await Promise.all([
    prisma.knowledgeArea.findMany({ where: { status: "Aktiv", parentId: null }, include: { _count: { select: { contentLinks: { where: { knowledgeContent: { status: "Aktiv" } } } } } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], take: 6 }),
    prisma.knowledgeLearningPath.findMany({ where: { status: "Aktiv" }, include: { _count: { select: { items: true } } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    prisma.knowledgeContent.findMany({ where: { status: "Aktiv", OR: [{ publishedAt: { gte: since } }, { majorUpdatedAt: { gte: since } }] }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: [{ majorUpdatedAt: "desc" }, { publishedAt: "desc" }], take: 6 }),
    prisma.knowledgeUserProgress.findMany({ where: { userId: user.id, knowledgeContent: { status: "Aktiv" } }, include: { knowledgeContent: { include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } } } }, orderBy: { lastViewedAt: "desc" }, take: 6 }),
    prisma.knowledgeContent.findMany({ where: { status: "Aktiv", contentTypes: { contains: "Kanzleistandard" } }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: { title: "asc" }, take: 4 }),
  ]);
  const recommendedPaths = paths.filter((path) => targetRoles.some((role) => path.targetAudiences.split("|").includes(role))).slice(0, 4);
  return <div>
    <OrdoCampusHeader active="/ordo-campus"/>
    <form action="/ordo-campus/suche" className="mb-9 flex max-w-4xl gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm"><label className="sr-only" htmlFor="campus-search">Wissen durchsuchen</label><input id="campus-search" className="input flex-1" name="q" placeholder="Wissen durchsuchen …"/><button className="button-primary">Suchen</button></form>
    <CampusSection title="Wissensgebiete" href="/ordo-campus/wissensgebiete"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{areas.map((area) => <Link href={`/ordo-campus/wissensgebiete/${area.id}`} className="rounded-xl border border-[var(--color-border)] bg-white p-5 hover:border-[var(--color-primary)]" key={area.id}><h3 className="text-lg font-bold">{area.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{area.shortDescription}</p><p className="mt-4 text-xs font-semibold text-[var(--color-primary-dark)]">{area._count.contentLinks} zugeordnete Inhalte</p></Link>)}</div></CampusSection>
    <CampusSection title="Empfohlene Lernpfade" href="/ordo-campus/lernpfade"><div className="grid gap-4 md:grid-cols-2">{recommendedPaths.map((path) => <Link href={`/ordo-campus/lernpfade/${path.id}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] p-5 hover:border-[var(--color-primary)]" key={path.id}><h3 className="font-bold text-[var(--color-primary-dark)]">{path.title}</h3><p className="mt-2 text-sm">{path.shortDescription}</p><p className="mt-3 text-xs font-semibold">{path._count.items} Inhalte</p></Link>)}</div></CampusSection>
    <CampusSection title="Neu und aktualisiert" href="/ordo-campus/neu"><KnowledgeGrid items={recent}/></CampusSection>
    <CampusSection title="Zuletzt angesehen" href="/ordo-campus/zuletzt"><KnowledgeGrid items={lastViewed.map((entry) => entry.knowledgeContent)}/></CampusSection>
    <CampusSection title="Kanzleistandards" href="/ordo-campus/kanzleistandards"><KnowledgeGrid items={standards}/></CampusSection>
  </div>;
}

function CampusSection({ title, href, children }: { title: string; href: string; children: React.ReactNode }) { return <section className="mb-10"><div className="mb-4 flex items-end justify-between gap-3"><h2 className="text-2xl font-bold">{title}</h2><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={href}>Alle anzeigen</Link></div>{children}</section>; }
function KnowledgeGrid({ items }: { items: Parameters<typeof KnowledgeCard>[0]["content"][] }) { return items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <KnowledgeCard key={item.id} content={item}/>)}</div> : <p className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">Noch keine passenden Inhalte vorhanden.</p>; }
