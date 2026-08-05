import Link from "next/link";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KnowledgeAreasPage() {
  await requireUser();
  const areas = await prisma.knowledgeArea.findMany({ where: { status: "Aktiv", parentId: null }, include: { children: { where: { status: "Aktiv" }, include: { _count: { select: { contentLinks: { where: { knowledgeContent: { status: "Aktiv" } } } } } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }, _count: { select: { contentLinks: { where: { knowledgeContent: { status: "Aktiv" } } } } } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return <div><OrdoCampusHeader active="/ordo-campus/wissensgebiete" title="Wissensgebiete" description="Fachwissen nach Kanzleibereichen und Arbeitsschwerpunkten erschließen."/><div className="grid gap-5 lg:grid-cols-2">{areas.map((area) => <article className="rounded-xl border border-[var(--color-border)] bg-white p-6" key={area.id}><Link href={`/ordo-campus/wissensgebiete/${area.id}`} className="text-xl font-bold hover:text-[var(--color-primary-dark)] hover:underline">{area.title}</Link><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{area.shortDescription}</p><p className="mt-3 text-xs font-semibold">{area._count.contentLinks} direkt zugeordnete Inhalte</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{area.children.map((child) => <Link href={`/ordo-campus/wissensgebiete/${child.id}`} className="rounded-lg bg-[var(--color-background)] p-3 text-sm hover:bg-[var(--color-primary-light)]" key={child.id}><strong>{child.title}</strong><span className="mt-1 block text-xs text-[var(--color-text-muted)]">{child._count.contentLinks} Inhalte</span></Link>)}</div></article>)}</div></div>;
}
